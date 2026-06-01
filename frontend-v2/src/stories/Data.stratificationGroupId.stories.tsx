import { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within, waitFor } from "storybook/test";
import { useDispatch } from "react-redux";
import { setProject as setReduxProject } from "../features/main/mainSlice";

import Data from "../features/data/Data";
import {
  project,
  projectHandlers,
  protocolHandlers,
  unitHandlers,
  simulationHandlers,
  combinedModels,
  variables,
  subjectGroupHandlers,
} from "./generated-mocks";

import { HttpResponse, http } from "msw";

// Test CSV with Group ID and multiple subjects in each group
const testGroupIdCSV = `ID,Time,Observation,Group ID
1,0,10,GroupA
1,1,15,GroupA
2,0,12,GroupA
3,0,11,GroupB
3,1,16,GroupB
4,0,13,GroupB`;

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
  ...subjectGroupHandlers,
  http.get("/api/subject", () => {
    return HttpResponse.json([], { status: 200 });
  }),
  http.get("/api/biomarker_type", () => {
    return HttpResponse.json([], { status: 200 });
  }),
  http.get("/api/combined_model", ({ request }) => {
    const url = new URL(request.url);
    const projectId = url.searchParams.get("project_id");
    if (projectId && parseInt(projectId) === project.id) {
      return HttpResponse.json(combinedModels, { status: 200 });
    }
    return HttpResponse.json([], { status: 200 });
  }),
  http.get("/api/variable", ({ request }) => {
    const url = new URL(request.url);
    const dosedPkModelId = url.searchParams.get("dosed_pk_model_id");
    if (dosedPkModelId) {
      const filtered = variables.filter(
        (v) => v.dosed_pk_model === parseInt(dosedPkModelId, 10),
      );
      return HttpResponse.json(filtered, { status: 200 });
    }
    return HttpResponse.json(variables, { status: 200 });
  }),
];

const meta: Meta<typeof Data> = {
  title: "Data Upload (create dataset)/Stratification with Group ID",
  component: Data,
  parameters: {
    layout: "fullscreen",
    msw: {
      handlers: {
        project: [
          ...projectHandlers,
          ...protocolHandlers,
          ...unitHandlers,
          ...simulationHandlers,
        ],
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

/**
 * Test that verifies Group ID column is now available as a categorical covariate
 * This tests the fix that adds "Group ID" to CAT_COVARIATE_COLUMNS
 */
export const UploadFileWithGroupIdColumn: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);

    // Upload the test file
    const fileInput = canvasElement.querySelector("input[type=file]");
    expect(fileInput).toBeInTheDocument();
    const file = new File([testGroupIdCSV], "test_group_id.csv", {
      type: "text/csv",
    });
    await userEvent.upload(fileInput as HTMLInputElement, file);

    // Wait for the data table to appear
    const dataTableHeading = await canvas.findByRole("heading", {
      name: "Imported Data Table",
    });
    expect(dataTableHeading).toBeInTheDocument();

    // Verify the data table is rendered
    const dataTable = canvas.getByRole("table", {
      name: "Imported Data Table",
    });
    expect(dataTable).toBeInTheDocument();

    // Find the "Group ID" column header to verify it exists in the data table
    const groupIdHeaders = within(dataTable).getAllByText("Group ID");
    expect(groupIdHeaders.length).toBeGreaterThan(0);
  },
};

/**
 * Test that verifies "Group ID" appears in the stratification dropdown options
 * and can be selected as the grouping column
 */
export const CanSelectGroupIdForStratification: Story = {
  play: async ({ context, canvasElement, userEvent }) => {
    const canvas = within(canvasElement);

    // First upload the file
    //@ts-expect-error play function arg types mismatch
    await UploadFileWithGroupIdColumn.play(context);

    // Move to Stratification step
    const nextButton = await canvas.findByRole("button", {
      name: "Next",
    });
    expect(nextButton).toBeInTheDocument();
    await userEvent.click(nextButton);

    // Wait for the Stratification section to be visible
    await waitFor(() => {
      const stratificationHeading = canvas.queryByRole("heading", {
        name: "Stratification",
      });
      expect(stratificationHeading).toBeInTheDocument();
    });

    // Verify the Group ID option exists in stratification and is selectable
    const radioButton = await canvas.findByLabelText("Group ID");
    expect(radioButton).toBeInTheDocument();
  },
};

/**
 * Test that verifies selecting "Group ID" as the grouping column creates proper groups
 */
export const SelectGroupIdAndVerifyGroupCreation: Story = {
  play: async ({ context, canvasElement, userEvent }) => {
    const canvas = within(canvasElement);

    // First upload the file and verify Group ID is available
    //@ts-expect-error play function arg types mismatch
    await CanSelectGroupIdForStratification.play(context);

    // Find and click the radio button for Group ID
    const radioButton = await canvas.findByLabelText("Group ID");
    await userEvent.click(radioButton);

    // Verify the radio button is now checked
    await waitFor(() => {
      expect(radioButton).toBeChecked();
    });

    // Wait for groups to be created based on Group ID
    await waitFor(() => {
      // Look for the Groups section heading
      const headings = canvas.getAllByRole("heading");
      const groupsHeading = headings.find((h) => h.textContent === "Groups");
      expect(groupsHeading).toBeInTheDocument();
    });

    // Verify tabs for groups are created after selecting Group ID
    const groupTabs = await canvas.findAllByRole("tab");
    expect(groupTabs.length).toBeGreaterThanOrEqual(2);
  },
};
