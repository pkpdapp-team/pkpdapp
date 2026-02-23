import { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within, screen, waitFor } from "storybook/test";
import { useDispatch } from "react-redux";
import { setProject as setReduxProject } from "../features/main/mainSlice";

import Data from "../features/data/Data";
import { project, projectHandlers } from "./project.v3.mock";
import testCSV from "./mockData/Data.File_pkpd.explorer_06.js";
import dosingUnitsCSV from "./mockData/Data.DosingUnits.js";

import { HttpResponse, http } from "msw";
import * as XLSX from "xlsx";

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
  title: "Data Upload (create dataset)",
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

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Check if the notifications button is present
    const notificationsButton = await canvas.findByRole("button", {
      name: "Notifications 1",
    });
    expect(notificationsButton).toBeInTheDocument();

    const uploadButton = await canvas.findByRole("button", {
      name: "Upload Dataset",
    });
    expect(uploadButton).toBeInTheDocument();
    const fileInput = canvasElement.querySelector("input[type=file]");
    expect(fileInput).toBeInTheDocument();
  },
};

export const UploadFile: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);

    const fileInput = canvasElement.querySelector("input[type=file]");
    expect(fileInput).toBeInTheDocument();
    const file = new File([testCSV], "test.csv", { type: "text/csv" });
    await userEvent.upload(fileInput as HTMLInputElement, file);

    const notificationsButton = await canvas.findByRole("button", {
      name: "Notifications 1",
    });
    expect(notificationsButton).toBeInTheDocument();
    const dataTableHeading = await canvas.findByRole("heading", {
      name: "Imported Data Table",
    });
    expect(dataTableHeading).toBeInTheDocument();
    const dataTable = canvas.getByRole("table", {
      name: "Imported Data Table",
    });
    expect(dataTable).toBeInTheDocument();
    const rows = within(dataTable).getAllByRole("row");
    expect(rows.length).toBe(49); // 48 data rows + 1 header row

    const uploadButton = canvas.queryByRole("button", {
      name: "Upload Dataset",
    });
    expect(uploadButton).toBeNull();
  },
};

// Helper function to create Excel file from CSV data
function createExcelFromCSV(csvString: string, filename: string, sheetNames?: string[]): File {
  // Parse CSV to get rows
  const lines = csvString.trim().split('\n');
  const data = lines.map(line => {
    // Simple CSV parsing - split by comma
    return line.split(',');
  });

  const workbook = XLSX.utils.book_new();

  if (sheetNames && sheetNames.length > 0) {
    // Create multiple sheets
    sheetNames.forEach((sheetName, index) => {
      const sheetData = index === 0 ? data : [["Other"], ["Data"]];
      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });
  } else {
    // Create single sheet
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  }

  const excelBuffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  return new File([excelBuffer], filename, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export const UploadExcelFile: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);

    const fileInput = canvasElement.querySelector("input[type=file]");
    expect(fileInput).toBeInTheDocument();

    // Create Excel file from the same test CSV data
    const file = createExcelFromCSV(testCSV, "test.xlsx");
    await userEvent.upload(fileInput as HTMLInputElement, file);

    const notificationsButton = await canvas.findByRole("button", {
      name: "Notifications 1",
    });
    expect(notificationsButton).toBeInTheDocument();
    const dataTableHeading = await canvas.findByRole("heading", {
      name: "Imported Data Table",
    });
    expect(dataTableHeading).toBeInTheDocument();
    const dataTable = canvas.getByRole("table", {
      name: "Imported Data Table",
    });
    expect(dataTable).toBeInTheDocument();
    const rows = within(dataTable).getAllByRole("row");
    expect(rows.length).toBe(49); // 48 data rows + 1 header row

    const uploadButton = canvas.queryByRole("button", {
      name: "Upload Dataset",
    });
    expect(uploadButton).toBeNull();
  },
};

export const UploadMultiSheetExcel: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);

    const fileInput = canvasElement.querySelector("input[type=file]");
    expect(fileInput).toBeInTheDocument();

    // Create multi-sheet Excel file (should use first sheet)
    const file = createExcelFromCSV(testCSV, "test_multi.xlsx", ["MainData", "OtherSheet"]);
    await userEvent.upload(fileInput as HTMLInputElement, file);

    // Should still work - uses first sheet
    const dataTableHeading = await canvas.findByRole("heading", {
      name: "Imported Data Table",
    });
    expect(dataTableHeading).toBeInTheDocument();
    const dataTable = canvas.getByRole("table", {
      name: "Imported Data Table",
    });
    expect(dataTable).toBeInTheDocument();
    const rows = within(dataTable).getAllByRole("row");
    expect(rows.length).toBe(49); // 48 data rows + 1 header row
  },
};

export const UploadInvalidFileType: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);

    const fileInput = canvasElement.querySelector("input[type=file]");
    expect(fileInput).toBeInTheDocument();

    // Try to upload a file with invalid MIME type
    const file = new File(["invalid content"], "test.pdf", { type: "application/pdf" });
    await userEvent.upload(fileInput as HTMLInputElement, file);

    // Should show error message
    const errorText = await canvas.findByText(/File type not supported/i);
    expect(errorText).toBeInTheDocument();
  },
};

export const UploadEmptyExcelFile: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);

    const fileInput = canvasElement.querySelector("input[type=file]");
    expect(fileInput).toBeInTheDocument();

    // Create empty Excel file (workbook with empty sheet)
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Empty");
    const excelBuffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
    const file = new File([excelBuffer], "empty.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    await userEvent.upload(fileInput as HTMLInputElement, file);

    // Should show error message about empty file
    const errorText = await canvas.findByText(/Excel file contains no data/i);
    expect(errorText).toBeInTheDocument();
  },
};


export const Stratification: Story = {
  play: async ({ context, canvasElement, userEvent }) => {
    const canvas = within(canvasElement);

    //@ts-expect-error play function arg types mismatch
    await UploadFile.play(context);

    const nextButton = await canvas.findByRole("button", {
      name: "Next",
    });
    expect(nextButton).toBeInTheDocument();
    await userEvent.click(nextButton);

    const stratificationHeading = await canvas.findByRole("heading", {
      name: "Stratification",
    });
    expect(stratificationHeading).toBeInTheDocument();

    const routeRadio = await canvas.findByRole("radio", {
      name: "Route",
    });
    await userEvent.click(routeRadio);
    expect(routeRadio).toBeChecked();
  },
};

export const MapDosing: Story = {
  play: async ({ context, canvasElement, userEvent }) => {
    const canvas = within(canvasElement);

    //@ts-expect-error play function arg types mismatch
    await Stratification.play(context);

    const nextButton = await canvas.findByRole("button", {
      name: "Next",
    });
    expect(nextButton).toBeInTheDocument();
    await userEvent.click(nextButton);

    const mapDosingHeading = await canvas.findByRole("heading", {
      name: "Dosing",
    });
    expect(mapDosingHeading).toBeInTheDocument();

    const variableSelects = canvas.getAllByRole("combobox", {
      name: "Variable",
    });
    expect(variableSelects.length).toBe(2);

    await userEvent.click(variableSelects[0]);
    let listbox = await screen.findByRole("listbox");
    const doseOption = await within(listbox).findByRole("option", {
      name: "A1",
    });
    await userEvent.selectOptions(listbox, doseOption);
    expect(variableSelects[0]).toHaveTextContent("A1");
    await userEvent.click(variableSelects[1]);
    listbox = await screen.findByRole("listbox");
    await userEvent.selectOptions(listbox, "A1");
    expect(variableSelects[1]).toHaveTextContent("A1");
    const unitSelects = canvas.getAllByRole("combobox", {
      name: "Units",
    });
    expect(unitSelects.length).toBe(2);
    unitSelects.forEach((select) => {
      expect(select).toHaveTextContent("mg");
    });
    const perKgCheckboxes = canvas.getAllByRole("checkbox", {
      name: "Per Body Weight(kg)",
    });
    expect(perKgCheckboxes.length).toBe(2);
    perKgCheckboxes.forEach((checkbox) => {
      expect(checkbox).toBeChecked();
    });
  },
};

export const MapObservations: Story = {
  play: async ({ context, canvasElement, userEvent }) => {
    const canvas = within(canvasElement);

    //@ts-expect-error play function arg types mismatch
    await MapDosing.play(context);

    const nextButton = await canvas.findByRole("button", {
      name: "Next",
    });
    expect(nextButton).toBeInTheDocument();
    await userEvent.click(nextButton);

    const mapObservationsHeading = await canvas.findByRole("heading", {
      name: "Observations",
    });
    expect(mapObservationsHeading).toBeInTheDocument();

    let variableSelect = canvas.getByRole("combobox", {
      name: "Variable",
    });
    expect(variableSelect).toBeInTheDocument();
    await userEvent.click(variableSelect);
    const listbox = await screen.findByRole("listbox");
    const observationOption = await within(listbox).findByRole("option", {
      name: "C1",
    });
    await userEvent.selectOptions(listbox, observationOption);
    variableSelect = canvas.getByRole("combobox", {
      name: "Variable",
    });
    expect(variableSelect).toHaveTextContent("C1");
    const unitSelect = canvas.getByRole("combobox", {
      name: "Units",
    });
    expect(unitSelect).toBeInTheDocument();
    expect(unitSelect).toHaveTextContent("mg/L");
    const perKgCheckbox = canvas.getByRole("checkbox", {
      name: "Per Body Weight(kg) for C1",
    });
    expect(perKgCheckbox).toBeInTheDocument();
    expect(perKgCheckbox).not.toBeChecked();
    expect(perKgCheckbox).toBeDisabled();
  },
};

export const PreviewDataset: Story = {
  play: async ({ context, canvasElement, userEvent }) => {
    const canvas = within(canvasElement);

    //@ts-expect-error play function arg types mismatch
    await MapObservations.play(context);

    const nextButton = await canvas.findByRole("button", {
      name: "Next",
    });
    expect(nextButton).toBeInTheDocument();
    await userEvent.click(nextButton);

    const previewHeading = await canvas.findByRole("heading", {
      name: "Preview Dataset",
    });
    expect(previewHeading).toBeInTheDocument();

    const dataGrid = canvas.getByRole("grid", {
      name: "Preview Dataset",
    });
    expect(dataGrid).toBeInTheDocument();
  },
};

// Test ADPC column name mapping
export const UploadADPCFile: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);

    const fileInput = canvasElement.querySelector("input[type=file]");
    expect(fileInput).toBeInTheDocument();

    // Create ADPC-formatted CSV with CDISC standard column names
    const adpcCSV = `USUBJID,AFRLT,RRLTU,AVAL,AVALU,DOSEA,DOSEU
1,0,h,.,ng/mL,50,mg
1,0.5,h,95,ng/mL,50,mg
1,1,h,80,ng/mL,50,mg
2,0,h,.,ng/mL,50,mg
2,0.5,h,115,ng/mL,50,mg
2,1,h,95,ng/mL,50,mg`;

    const file = new File([adpcCSV], "adpc_test.csv", { type: "text/csv" });
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

    // Verify ADPC columns are auto-mapped correctly by checking the displayed values in selects
    const allSelects = within(dataTable).getAllByRole("combobox");

    // For MUI Select, the displayed value is in the element's textContent
    // Verify each ADPC column is auto-mapped to the correct type
    expect(allSelects[0]).toHaveTextContent("ID"); // USUBJID → ID
    expect(allSelects[1]).toHaveTextContent("Time"); // AFRLT → Time
    expect(allSelects[2]).toHaveTextContent("Time Unit"); // RRLTU → Time Unit
    expect(allSelects[3]).toHaveTextContent("Observation"); // AVAL → Observation
    expect(allSelects[4]).toHaveTextContent("Observation Unit"); // AVALU → Observation Unit
    expect(allSelects[5]).toHaveTextContent("Amount"); // DOSEA → Amount
    expect(allSelects[6]).toHaveTextContent("Amount Unit"); // DOSEU → Amount Unit

    // Check that we have 7 rows (6 data + 1 header)
    const rows = within(dataTable).getAllByRole("row");
    expect(rows.length).toBe(7);
  },
};

// uploads a csv with dosing amounts and units, and observation concentrations and units
export const UploadObsDoseUnitsFile: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);

    const fileInput = canvasElement.querySelector("input[type=file]");
    expect(fileInput).toBeInTheDocument();
    const file = new File([dosingUnitsCSV], "dosing_test.csv", { type: "text/csv" });
    await userEvent.upload(fileInput as HTMLInputElement, file);

    const notificationsButton = await canvas.findByRole("button", {
      name: "Notifications 1",
    });
    expect(notificationsButton).toBeInTheDocument();
    const dataTableHeading = await canvas.findByRole("heading", {
      name: "Imported Data Table",
    });
    expect(dataTableHeading).toBeInTheDocument();
    const dataTable = canvas.getByRole("table", {
      name: "Imported Data Table",
    });
    expect(dataTable).toBeInTheDocument();
    const rows = within(dataTable).getAllByRole("row");
    expect(rows.length).toBe(12); // 11 data rows + 1 header row
  },
};

// follows on from UploadObsDoseUnitsFile to get to the stratification step
export const ObsDoseUnitsStratification: Story = {
  play: async ({ context, canvasElement, userEvent }) => {
    const canvas = within(canvasElement);

    //@ts-expect-error play function arg types mismatch
    await UploadObsDoseUnitsFile.play(context);

    const nextButton = await canvas.findByRole("button", {
      name: "Next",
    });
    expect(nextButton).toBeInTheDocument();
    await userEvent.click(nextButton);

    const stratificationHeading = await canvas.findByRole("heading", {
      name: "Stratification",
    });
    expect(stratificationHeading).toBeInTheDocument();

    // Use the default Group column for stratification (don't change grouping)
    // This avoids validation errors about inconsistent doses within route groups
  },
};


// follow on from ObsDoseUnitsStratification to get to the Map Dosing step
// the amount units should be displayed in the unit selects.
export const MapDosingShowsAmountUnits: Story = {
  play: async ({ context, canvasElement, userEvent }) => {
    const canvas = within(canvasElement);

    //@ts-expect-error play function arg types mismatch
    await ObsDoseUnitsStratification.play(context);

    const nextButton = await canvas.findByRole("button", {
      name: "Next",
    });
    expect(nextButton).toBeInTheDocument();
    await userEvent.click(nextButton);

    const mapDosingHeading = await canvas.findByRole("heading", {
      name: "Dosing",
    });
    expect(mapDosingHeading).toBeInTheDocument();

    // Wait for the table to be rendered
    const dosingTable = await canvas.findByRole("table", {
      name: "Dosing",
    });
    expect(dosingTable).toBeInTheDocument();

    // The Amount Unit selects should show "mg" from the CSV's Units_AMT column,
    // Get all unit selects
    const unitSelects = canvas.getAllByRole("combobox", {
      name: "Units",
    });
    expect(unitSelects.length).toBeGreaterThan(0);

    // Wait for the first unit select to be rendered
    await waitFor(() => {
      const firstUnitSelect = unitSelects[0];
      const displayedValue = firstUnitSelect.textContent;

      console.log("Amount Unit displayed value:", displayedValue);

      // Expected: "mg" (from CSV Units_AMT column)
      expect(displayedValue).toBe("mg");
    }, { timeout: 5000 });
    const variableSelects = canvas.getAllByRole("combobox", {
      name: "Variable",
    });
    expect(variableSelects.length).toBeGreaterThan(0);

    await userEvent.click(variableSelects[0]);
    let listbox = await screen.findByRole("listbox");
    const a1Option = await within(listbox).findByRole("option", {
      name: "A1",
    });
    await userEvent.selectOptions(listbox, a1Option);

    // If there are multiple administrations, select variable for the second one too
    if (variableSelects.length > 1) {
      await userEvent.click(variableSelects[1]);
      listbox = await screen.findByRole("listbox");
      const a1Option2 = await within(listbox).findByRole("option", {
        name: "A1",
      });
      await userEvent.selectOptions(listbox, a1Option2);
    }

    // After selecting a dosing compartment, the unit should still show "mg"
    await waitFor(() => {
      const firstUnitSelect = unitSelects[0];
      const displayedValue = firstUnitSelect.textContent;

      console.log("Amount Unit after selecting compartment:", displayedValue);

      // The bug causes this to potentially show "None" even after selecting A1
      // After fix, it should show "mg" (possibly with a warning if incompatible)
      expect(displayedValue).not.toBe("");
    });
  },
};

// Test for validation that disables Next button when variable/unit not selected
export const MapDosingValidation: Story = {
  play: async ({ context, canvasElement, userEvent }) => {
    const canvas = within(canvasElement);

    //@ts-expect-error play function arg types mismatch
    await ObsDoseUnitsStratification.play(context);

    const nextButton = await canvas.findByRole("button", {
      name: "Next",
    });
    expect(nextButton).toBeInTheDocument();
    await userEvent.click(nextButton);

    const mapDosingHeading = await canvas.findByRole("heading", {
      name: "Dosing",
    });
    expect(mapDosingHeading).toBeInTheDocument();

    // Wait for the table to be rendered
    const dosingTable = await canvas.findByRole("table", {
      name: "Dosing",
    });
    expect(dosingTable).toBeInTheDocument();

    // The Next button should be disabled initially because no variables are selected
    await waitFor(() => {
      const nextBtn = canvas.getByRole("button", { name: "Next" });
      expect(nextBtn).toBeDisabled();
    });

    // Verify the error notification appears
    const notificationButton = canvas.queryByRole("button", {
      name: /Notifications/,
    });
    if (notificationButton) {
      // Should show at least 1 notification for the validation error
      expect(notificationButton.textContent).toMatch(/\d+/);
    }

    // Get all variable selects
    const variableSelects = canvas.getAllByRole("combobox", {
      name: "Variable",
    });
    expect(variableSelects.length).toBeGreaterThan(0);

    // Select variable for first administration
    await userEvent.click(variableSelects[0]);
    let listbox = await screen.findByRole("listbox");
    const a1Option = await within(listbox).findByRole("option", {
      name: "A1",
    });
    await userEvent.selectOptions(listbox, a1Option);

    // Get all unit selects
    const unitSelects = canvas.getAllByRole("combobox", {
      name: "Units",
    });

    // If there are multiple administrations, select variable for the second one too
    if (variableSelects.length > 1) {
      await userEvent.click(variableSelects[1]);
      listbox = await screen.findByRole("listbox");
      const a1Option2 = await within(listbox).findByRole("option", {
        name: "A1",
      });
      await userEvent.selectOptions(listbox, a1Option2);
    }

    // Next button should be enabled now (CSV has units pre-populated with "mg")
    await waitFor(() => {
      const nextBtn = canvas.getByRole("button", { name: "Next" });
      expect(nextBtn).not.toBeDisabled();
    }, { timeout: 5000 });

    // Change the unit to "None" for the first administration
    await userEvent.click(unitSelects[0]);
    listbox = await screen.findByRole("listbox");
    const noneOption = await within(listbox).findByRole("option", {
      name: "None",
    });
    await userEvent.selectOptions(listbox, noneOption);

    // Next button should be disabled again (unit is now None)
    await waitFor(() => {
      const nextBtn = canvas.getByRole("button", { name: "Next" });
      expect(nextBtn).toBeDisabled();
    }, { timeout: 5000 });

    // Change the unit back to "mg"
    await userEvent.click(unitSelects[0]);
    listbox = await screen.findByRole("listbox");
    const mgOption = await within(listbox).findByRole("option", {
      name: "mg",
    });
    await userEvent.selectOptions(listbox, mgOption);

    // Next button should be enabled again
    await waitFor(() => {
      const nextBtn = canvas.getByRole("button", { name: "Next" });
      expect(nextBtn).not.toBeDisabled();
    }, { timeout: 5000 });
  },
};

// follow on from MapDosingShowsAmountUnits to get to the Map Observations step
// the observation units should be displayed in the unit selects.
export const MapObservationsShowsObservationUnits: Story = {
  play: async ({ context, canvasElement, userEvent }) => {
    const canvas = within(canvasElement);

    //@ts-expect-error play function arg types mismatch
    await MapDosingShowsAmountUnits.play(context);

    // Wait for the Next button to be enabled
    await waitFor(() => {
      const nextBtn = canvas.getByRole("button", { name: "Next" });
      expect(nextBtn).not.toBeDisabled();
    }, { timeout: 5000 });

    const nextButton = canvas.getByRole("button", {
      name: "Next",
    });
    expect(nextButton).toBeInTheDocument();
    expect(nextButton).not.toBeDisabled();
    await userEvent.click(nextButton);

    // Wait for navigation to Observations tab
    const mapObservationsHeading = await canvas.findByRole("heading", {
      name: "Observations",
    }, { timeout: 10000 });
    expect(mapObservationsHeading).toBeInTheDocument();

    // The Observation Unit selects should show "mg/L" from the CSV's Units_Conc column
    // Get all unit selects
    const unitSelects = canvas.getAllByRole("combobox", {
      name: "Units",
    });
    expect(unitSelects.length).toBeGreaterThan(0);

    // Wait for the first unit select to be rendered
    await waitFor(() => {
      const firstUnitSelect = unitSelects[0];
      const displayedValue = firstUnitSelect.textContent;

      console.log("Observation Unit displayed value:", displayedValue);

      // Expected: "mg/L" (from CSV Units_Conc column)
      expect(displayedValue).toBe("mg/L");
    }, { timeout: 5000 });

    const variableSelects = canvas.getAllByRole("combobox", {
      name: "Variable",
    });
    expect(variableSelects.length).toBeGreaterThan(0);

    await userEvent.click(variableSelects[0]);
    const listbox = await screen.findByRole("listbox");
    const c1Option = await within(listbox).findByRole("option", {
      name: "C1",
    });
    await userEvent.selectOptions(listbox, c1Option);

    // After selecting an observation compartment, the unit should still show "mg/L"
    await waitFor(() => {
      const firstUnitSelect = unitSelects[0];
      const displayedValue = firstUnitSelect.textContent;

      console.log("Observation Unit after selecting compartment:", displayedValue);

      // The bug causes this to potentially show "None" even after selecting C1
      // After fix, it should show "mg/L" (possibly with a warning if incompatible)
      expect(displayedValue).toBe("mg/L");
    });
  },
};
