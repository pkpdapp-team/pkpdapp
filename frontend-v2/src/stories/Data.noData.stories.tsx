import { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within, screen } from "storybook/test";
import { useDispatch } from "react-redux";
import { setProject as setReduxProject } from "../features/main/mainSlice";

import Data from "../features/data/Data";
import { project, projectHandlers } from "./project.v3.mock";
import testCSV from "./mockData/Data.File_pkpd.explorer_06.js";

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
