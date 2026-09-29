import { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within, waitFor } from "storybook/test";
import { useDispatch } from "react-redux";
import { setProject as setReduxProject } from "../features/main/mainSlice";

import Data from "../features/data/Data";
import {
  project,
  projectHandlers,
  modelHandlers,
  protocolHandlers,
  unitHandlers,
  variableHandlers,
  simulationHandlers,
  datasetHandlers,
  subjectHandlers,
  subjectGroupHandlers,
  biomarkerTypeHandlers,
} from "./generated-mocks";

// Test CSV with Group ID and multiple subjects in each group
const testGroupIdCSV = `ID,Time,Observation,Group ID
1,0,10,GroupA
1,1,15,GroupA
2,0,12,GroupA
3,0,11,GroupB
3,1,16,GroupB
4,0,13,GroupB`;

// Test CSV whose header is "GroupID" (no space); it auto-maps to the "Group ID"
// type and must not produce a duplicate canonical "Group ID" stratification row.
const testGroupIdNoSpaceCSV = `ID,Time,Observation,GroupID
1,0,10,GroupA
1,1,15,GroupA
2,0,12,GroupA
3,0,11,GroupB
3,1,16,GroupB
4,0,13,GroupB`;

const meta: Meta<typeof Data> = {
  title: "Data Upload (create dataset)/Stratification with Group ID",
  component: Data,
  parameters: {
    layout: "fullscreen",
    msw: {
      handlers: [
        ...projectHandlers,
        ...modelHandlers,
        ...protocolHandlers,
        ...unitHandlers,
        ...variableHandlers,
        ...simulationHandlers,
        ...datasetHandlers,
        ...subjectHandlers,
        ...subjectGroupHandlers,
        ...biomarkerTypeHandlers,
      ],
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
 * Test that verifies a mapped "Group ID" column is the default grouping column in
 * the Stratification tab, without the user having to select it, and that no
 * auto-created "Group" covariate is added alongside it.
 */
export const GroupIdIsDefaultStratification: Story = {
  play: async ({ context, canvasElement }) => {
    const canvas = within(canvasElement);

    // Upload the file and move to the Stratification step.
    //@ts-expect-error play function arg types mismatch
    await CanSelectGroupIdForStratification.play(context);

    // The Group ID radio is pre-selected as the primary grouping column.
    const groupIdRadio = await canvas.findByLabelText("Group ID");
    await waitFor(() => {
      expect(groupIdRadio).toBeChecked();
    });

    // No redundant auto-created "Group" covariate row is present.
    expect(canvas.queryByLabelText("Group")).not.toBeInTheDocument();

    // Groups are derived from the Group ID column (GroupA, GroupB).
    const groupTabs = await canvas.findAllByRole("tab");
    expect(groupTabs.length).toBeGreaterThanOrEqual(2);
  },
};

/**
 * Test that verifies a "GroupID" (no space) column, which auto-maps to the
 * "Group ID" type, is shown as a single stratification row and is not duplicated
 * by the derived canonical "Group ID" data column.
 */
export const GroupIdColumnIsNotDuplicated: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);

    // Upload a file whose header is "GroupID" (no space).
    const fileInput = canvasElement.querySelector("input[type=file]");
    expect(fileInput).toBeInTheDocument();
    const file = new File([testGroupIdNoSpaceCSV], "test_group_id_no_space.csv", {
      type: "text/csv",
    });
    await userEvent.upload(fileInput as HTMLInputElement, file);

    await canvas.findByRole("heading", { name: "Imported Data Table" });

    // Move to the Stratification step.
    const nextButton = await canvas.findByRole("button", { name: "Next" });
    await userEvent.click(nextButton);

    await waitFor(() => {
      expect(
        canvas.queryByRole("heading", { name: "Stratification" }),
      ).toBeInTheDocument();
    });

    // The user's "GroupID" column is the primary grouping column.
    const groupIdRadio = await canvas.findByLabelText("GroupID");
    await waitFor(() => {
      expect(groupIdRadio).toBeChecked();
    });

    // The derived canonical "Group ID" (with space) column is not shown as a
    // separate, duplicate stratification row.
    expect(canvas.queryByLabelText("Group ID")).not.toBeInTheDocument();
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
