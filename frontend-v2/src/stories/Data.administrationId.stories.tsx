import { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within, screen, waitFor } from "storybook/test";
import { useDispatch } from "react-redux";
import { setProject as setReduxProject } from "../features/main/mainSlice";

import Data from "../features/data/Data";
import { project, projectHandlers } from "./generated-mocks";

import { HttpResponse, http } from "msw";

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
  title: "Data Upload (Administration ID Bug)",
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

// Test that reproduces the bug where Administration ID is NOT being added
// to normalisedFields when there's NO Administration ID column in the CSV
// but one needs to be created based on group/route stratification
export const UploadFileWithoutAdministrationId: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);

    const fileInput = canvasElement.querySelector("input[type=file]");
    expect(fileInput).toBeInTheDocument();

    // Create CSV WITHOUT ADM column - has two groups (IV and SC routes)
    // This reproduces the bug where Administration ID needs to be created
    // but is not added to normalisedFields
    const csvWithoutAdm = `ID;Group;Route;Time;Units_Time;Conc;Units_Conc;AMT;Units_AMT
1;1;IV;0;h;0;mg/L;100;mg
1;1;IV;2;h;10;mg/L;;
1;1;IV;4;h;8;mg/L;;
2;1;IV;0;h;0;mg/L;100;mg
2;1;IV;2;h;12;mg/L;;
2;1;IV;4;h;9;mg/L;;
3;2;SC;0;h;0;mg/L;150;mg
3;2;SC;2;h;15;mg/L;;
3;2;SC;4;h;12;mg/L;;`;

    const file = new File([csvWithoutAdm], "test_no_adm.csv", { type: "text/csv" });
    await userEvent.upload(fileInput as HTMLInputElement, file);

    // Verify data table is shown
    const dataTableHeading = await canvas.findByRole("heading", {
      name: "Imported Data Table",
    });
    expect(dataTableHeading).toBeInTheDocument();

    const dataTable = canvas.getByRole("table", {
      name: "Imported Data Table",
    });
    expect(dataTable).toBeInTheDocument();

    // Check that we have the correct number of rows (9 data + 1 header)
    const rows = within(dataTable).getAllByRole("row");
    expect(rows.length).toBe(10);

    // Verify there's NO ADM column initially in the uploaded data
    const allSelects = within(dataTable).getAllByRole("combobox");
    const admSelectIndex = allSelects.findIndex(
      (select) => select.textContent === "Administration ID"
    );
    // Should NOT find Administration ID in the initial upload
    expect(admSelectIndex).toBe(-1);
  },
};

// Follow-on test: After uploading CSV without Administration ID column,
// go through stratification and dosing mapping to verify Administration ID
// field is created and added to normalisedFields properly
export const CreateAdministrationIdFromGroups: Story = {
  play: async ({ context, canvasElement, userEvent }) => {
    const canvas = within(canvasElement);

    //@ts-expect-error play function arg types mismatch
    await UploadFileWithoutAdministrationId.play(context);

    // Click Next to go to Stratification
    const nextButton = await canvas.findByRole("button", {
      name: "Next",
    });
    expect(nextButton).toBeInTheDocument();
    await userEvent.click(nextButton);

    const stratificationHeading = await canvas.findByRole("heading", {
      name: "Stratification",
    });
    expect(stratificationHeading).toBeInTheDocument();

    // Use Route column for stratification (creates 2 groups: IV and SC)
    const routeRadio = await canvas.findByRole("radio", {
      name: "Route",
    });
    await userEvent.click(routeRadio);
    expect(routeRadio).toBeChecked();

    // Click Next to proceed to Map Dosing
    const nextButton2 = await canvas.findByRole("button", {
      name: "Next",
    });
    await userEvent.click(nextButton2);

    // Wait for Map Dosing page
    const mapDosingHeading = await canvas.findByRole("heading", {
      name: "Dosing",
    });
    expect(mapDosingHeading).toBeInTheDocument();

    // Verify we have 2 dosing protocol rows (one for each group)
    const variableSelects = canvas.getAllByRole("combobox", {
      name: "Variable",
    });
    expect(variableSelects.length).toBe(2);

    // Select different dosing compartments for each group
    // First group (IV) -> A1 (direct dosing)
    await userEvent.click(variableSelects[0]);
    let listbox = await screen.findByRole("listbox");
    const a1Option = await within(listbox).findByRole("option", {
      name: "A1",
    });
    await userEvent.selectOptions(listbox, a1Option);

    // Second group (SC) -> Aa (subcutaneous absorption)
    await userEvent.click(variableSelects[1]);
    listbox = await screen.findByRole("listbox");
    const aaOption = await within(listbox).findByRole("option", {
      name: "Aa",
    });
    await userEvent.selectOptions(listbox, aaOption);

    // Verify Administration IDs are shown (should be 1 and 2)
    const dosingTable = await canvas.findByRole("table", {
      name: "Dosing",
    });
    expect(dosingTable).toBeInTheDocument();

    const tableCells = within(dosingTable).getAllByRole("cell");
    // First column should contain Administration IDs
    // After mapping to different compartments, we should see admin IDs 1 and 2
    const adminIdCells = tableCells.filter(cell =>
      cell.textContent === "1" || cell.textContent === "2"
    );
    expect(adminIdCells.length).toBeGreaterThanOrEqual(2);

    // Proceed to next step
    await waitFor(() => {
      const nextBtn = canvas.getByRole("button", { name: "Next" });
      expect(nextBtn).not.toBeDisabled();
    }, { timeout: 5000 });

    const nextButton3 = canvas.getByRole("button", {
      name: "Next",
    });
    await userEvent.click(nextButton3);

    // Wait for Map Observations page
    const mapObservationsHeading = await canvas.findByRole("heading", {
      name: "Observations",
    });
    expect(mapObservationsHeading).toBeInTheDocument();

    // Select observation variable
    const obsVariableSelect = canvas.getByRole("combobox", {
      name: "Variable",
    });
    await userEvent.click(obsVariableSelect);
    const obsListbox = await screen.findByRole("listbox");
    const c1Option = await within(obsListbox).findByRole("option", {
      name: "C1",
    });
    await userEvent.selectOptions(obsListbox, c1Option);

    // Proceed to Preview
    await waitFor(() => {
      const nextBtn = canvas.getByRole("button", { name: "Next" });
      expect(nextBtn).not.toBeDisabled();
    }, { timeout: 5000 });

    const nextButton4 = canvas.getByRole("button", {
      name: "Next",
    });
    await userEvent.click(nextButton4);

    // Wait for Preview page
    const previewHeading = await canvas.findByRole("heading", {
      name: "Preview Dataset",
    });
    expect(previewHeading).toBeInTheDocument();

    // The preview should show the data grid
    const dataGrid = canvas.getByRole("grid", {
      name: "Preview Dataset",
    });
    expect(dataGrid).toBeInTheDocument();

    // BUG TEST: Verify Administration ID column is present in the preview
    // Before the fix, it was missing from normalisedFields so wouldn't appear
    // After the fix, it should be present with values 1 and 2 for the two groups

    // Wait for grid to be populated
    await waitFor(() => {
      const gridCells = within(dataGrid).getAllByRole("gridcell");
      expect(gridCells.length).toBeGreaterThan(0);
    }, { timeout: 5000 });

    // Get all column headers to find the Administration ID column
    const columnHeaders = within(dataGrid).getAllByRole("columnheader");
    const adminIdHeader = columnHeaders.find(header =>
      header.textContent?.includes("Administration ID") ||
      header.textContent?.includes("ADM")
    );

    // Administration ID column should exist
    expect(adminIdHeader).toBeDefined();

    // Get all grid cells and find ones with Administration ID values
    const gridCells = within(dataGrid).getAllByRole("gridcell");

    // Find cells containing Administration ID value "1" for group 1 (IV)
    const adminId1Cells = gridCells.filter(cell => {
      const text = cell.textContent?.trim();
      return text === "1";
    });
    expect(adminId1Cells.length).toBeGreaterThan(0);

    // Find cells containing Administration ID value "2" for group 2 (SC)
    const adminId2Cells = gridCells.filter(cell => {
      const text = cell.textContent?.trim();
      return text === "2";
    });
    expect(adminId2Cells.length).toBeGreaterThan(0);
  },
};
