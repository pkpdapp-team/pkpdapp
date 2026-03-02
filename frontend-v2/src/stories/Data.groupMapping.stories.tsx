import { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within, waitFor, screen } from "storybook/test";
import { useDispatch } from "react-redux";
import { setProject as setReduxProject } from "../features/main/mainSlice";

import Data from "../features/data/Data";
import { project, projectHandlers } from "./generated-mocks";

import { HttpResponse, http } from "msw";

// Test CSV with a "Group" column that should be manually mappable to "Group ID"
const testGroupCSV = `ID,Time,Observation,Group
1,0,10,A
1,1,15,A
2,0,12,B
2,1,18,B`;

const datasetHandlers = [
  http.get("/api/dataset/:id", () => {
    return HttpResponse.json(
      {
        id: 1,
        name: "Test Dataset",
        subjects: [],
        groups: [],
      },
      { status: 200 },
    );
  }),
  http.get("/api/subject_group", () => {
    return HttpResponse.json([], { status: 200 });
  }),
  http.get("/api/subject", () => {
    return HttpResponse.json([], { status: 200 });
  }),
  http.get("/api/biomarker_type", () => {
    return HttpResponse.json([], { status: 200 });
  }),
];

const meta: Meta<typeof Data> = {
  title: "Data Upload (Group Mapping Fix)",
  component: Data,
  parameters: {
    layout: "fullscreen",
    msw: {
      handlers: {
        project: projectHandlers,
        dataset: datasetHandlers,
      },
    },
  },
  decorators: [
    (Story) => {
      const dispatch = useDispatch();
      dispatch(setReduxProject(project.id));
      return <Story />;
    },
  ],
};

export default meta;

type Story = StoryObj<typeof Data>;

export const UploadFileWithGroupColumn: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);

    const fileInput = canvasElement.querySelector("input[type=file]");
    expect(fileInput).toBeInTheDocument();
    const file = new File([testGroupCSV], "test_group.csv", { type: "text/csv" });
    await userEvent.upload(fileInput as HTMLInputElement, file);

    const dataTableHeading = await canvas.findByRole("heading", {
      name: "Imported Data Table",
    });
    expect(dataTableHeading).toBeInTheDocument();

    // Verify "Group" column is auto-mapped to "Cat Covariate"
    const dataTable = canvas.getByRole("table", {
      name: "Imported Data Table",
    });
    expect(dataTable).toBeInTheDocument();

    // Find the "Group" column header
    const groupHeader = await canvas.findByText("Group");
    expect(groupHeader).toBeInTheDocument();

    // Find the dropdown for the "Group" column (it's in the same TableCell)
    const groupCell = groupHeader.closest("th");
    expect(groupCell).toBeInTheDocument();

    const groupDropdown = within(groupCell!).getByRole("combobox", {
      name: "Column Type",
    });
    expect(groupDropdown).toBeInTheDocument();

    // Verify initial mapping is "Cat Covariate"
    await waitFor(() => {
      expect(groupDropdown).toHaveTextContent("Cat Covariate");
    });
  },
};

/**
 * Test that verifies the fix for todo #2:
 * Users should be able to manually change "Group" from "Cat Covariate" to "Group ID"
 * and the change should persist (not be reverted by useEffect)
 */
export const ManuallyChangeGroupToCatCovariateToGroupID: Story = {
  play: async ({ context, canvasElement, userEvent }) => {
    const canvas = within(canvasElement);

    // First upload the file
    //@ts-expect-error play function arg types mismatch
    await UploadFileWithGroupColumn.play(context);

    // Find the "Group" column dropdown
    const groupHeader = await canvas.findByText("Group");
    const groupCell = groupHeader.closest("th");
    const groupDropdown = within(groupCell!).getByRole("combobox", {
      name: "Column Type",
    });

    // Verify it starts as "Cat Covariate"
    await waitFor(() => {
      expect(groupDropdown).toHaveTextContent("Cat Covariate");
    });

    // Click the dropdown to open it
    await userEvent.click(groupDropdown);

    // Find and select "Group ID" from the dropdown
    // The options are in a listbox that appears when dropdown is opened
    // MUI renders the listbox outside the canvas in a portal
    const listbox = await screen.findByRole("listbox");
    expect(listbox).toBeInTheDocument();

    // Find "Group ID" option in the "Other" section
    const groupIdOption = await within(listbox).findByRole("option", {
      name: "Group ID",
    });
    expect(groupIdOption).toBeInTheDocument();

    // Click the "Group ID" option
    await userEvent.click(groupIdOption);

    // CRITICAL TEST: Verify the change persists and doesn't get reverted
    // This is the bug we're fixing - previously the useEffect would reset it back
    await waitFor(() => {
      expect(groupDropdown).toHaveTextContent("Group ID");
    }, { timeout: 2000 });

    // Wait a bit more to ensure no useEffect reverts the change
    await new Promise(resolve => setTimeout(resolve, 500));

    // Final verification - it should STILL be "Group ID"
    expect(groupDropdown).toHaveTextContent("Group ID");
  },
};
