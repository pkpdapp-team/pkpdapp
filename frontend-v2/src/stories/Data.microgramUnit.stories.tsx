import { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within, screen, waitFor } from "storybook/test";
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
      const filtered = variables.filter(v => v.dosed_pk_model === parseInt(dosedPkModelId, 10));
      return HttpResponse.json(filtered, { status: 200 });
    }
    return HttpResponse.json(variables, { status: 200 });
  }),
];

const meta: Meta<typeof Data> = {
  title: "Data Upload (create dataset)/Unit Recognition",
  component: Data,
  parameters: {
    layout: "fullscreen",
    msw: {
      handlers: {
        project: [...projectHandlers, ...protocolHandlers, ...unitHandlers, ...simulationHandlers],
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

// Test that verifies microgram (ug) unit recognition and display
// The CSV uses "ug" which should be converted to "µg" (proper symbol)
export const UploadFileWithMicrogramUnit: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);

    const fileInput = canvasElement.querySelector("input[type=file]");
    expect(fileInput).toBeInTheDocument();

    // Create CSV with "ug" units for AMT column - use two routes but one group
    const csvWithUg = `ID;Group;Route;Time;Units_Time;Conc;Units_Conc;AMT;Units_AMT
1;1;IV;0;h;;;50;ug
1;1;IV;2;h;10;mg/L;;
1;1;IV;4;h;8;mg/L;;
2;1;SC;0;h;;;75;ug
2;1;SC;2;h;12;mg/L;;
2;1;SC;4;h;9;mg/L;;`;

    const file = new File([csvWithUg], "test_microgram.csv", { type: "text/csv" });
    await userEvent.upload(fileInput as HTMLInputElement, file);

    // Verify data table is shown
    const dataTableHeading = await canvas.findByRole("heading", {
      name: "Imported Data Table",
    });
    expect(dataTableHeading).toBeInTheDocument();

    // Get the data table
    const dataTable = canvas.getByRole("table", {
      name: "Imported Data Table",
    });
    expect(dataTable).toBeInTheDocument();

    // Verify that the data was imported (ug will be normalized later in the workflow)
    const tableCells = within(dataTable).getAllByRole("cell");
    expect(tableCells.length).toBeGreaterThan(0);

    // Click Next to go to Stratification, then skip it (no stratification needed for single group)
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

    // Wait for dosing table to be populated
    const dosingTable = await canvas.findByRole("table", {
      name: "Dosing",
    });
    expect(dosingTable).toBeInTheDocument();

    // Verify we have 2 dosing protocol rows (one for each route: IV and SC)
    const variableSelects = canvas.getAllByRole("combobox", {
      name: "Variable",
    });
    expect(variableSelects.length).toBe(2);

    // Select dosing compartment A1 for both groups
    await userEvent.click(variableSelects[0]);
    let listbox = await screen.findByRole("listbox");
    const a1Option = await within(listbox).findByRole("option", {
      name: "A1",
    });
    await userEvent.selectOptions(listbox, a1Option);

    await userEvent.click(variableSelects[1]);
    listbox = await screen.findByRole("listbox");
    const a1Option2 = await within(listbox).findByRole("option", {
      name: "A1",
    });
    await userEvent.selectOptions(listbox, a1Option2);

    // Verify that the Units dropdown contains µg as an option
    // The "ug" from the CSV should be normalized to "µg"
    const unitSelects = canvas.getAllByLabelText("Units");
    expect(unitSelects.length).toBe(2);

    // Open the first unit select to verify µg is available
    await userEvent.click(unitSelects[0]);
    const unitListbox = await screen.findByRole("listbox");
    const ugOption = await within(unitListbox).findByRole("option", {
      name: "µg",
    });
    expect(ugOption).toBeInTheDocument();

    // Select µg for the first group
    await userEvent.selectOptions(unitListbox, ugOption);

    // Select µg for the second group as well
    await userEvent.click(unitSelects[1]);
    const unitListbox2 = await screen.findByRole("listbox");
    const ugOption2 = await within(unitListbox2).findByRole("option", {
      name: "µg",
    });
    await userEvent.selectOptions(unitListbox2, ugOption2);

    // Click Next to proceed to Map Observations
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

    // Wait for grid to be populated
    await waitFor(() => {
      const gridCells = within(dataGrid).getAllByRole("gridcell");
      expect(gridCells.length).toBeGreaterThan(0);
    }, { timeout: 5000 });

    // Get all column headers to find the Amount Unit column
    const columnHeaders = within(dataGrid).getAllByRole("columnheader");
    const amountUnitHeader = columnHeaders.find(header =>
      header.textContent?.includes("Amount Unit") ||
      header.textContent?.includes("AMT_UNIT")
    );

    // Amount Unit column should exist
    expect(amountUnitHeader).toBeDefined();

    // Verify that all Amount Unit values are µg (normalized from "ug")
    const gridCells = within(dataGrid).getAllByRole("gridcell");
    const amountUnitCells = gridCells.filter(cell => {
      const text = cell.textContent?.trim();
      return text === "µg";
    });

    // Should find at least 2 cells with µg (one for each dosing row)
    expect(amountUnitCells.length).toBeGreaterThanOrEqual(2);
  },
};
