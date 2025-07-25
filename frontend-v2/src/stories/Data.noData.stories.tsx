import { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within, screen } from "storybook/test";
import { useDispatch } from "react-redux";
import { setProject as setReduxProject } from "../features/main/mainSlice";

import Data from "../features/data/Data";
import { project, projectHandlers } from "./project.mock";
import testCSV from "./mockData/Data.File_pkpd.explorer_06.js";

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
      name: "Group ID Route",
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
    await userEvent.selectOptions(listbox, "Aa");
    expect(variableSelects[1]).toHaveTextContent("Aa");
    const unitSelects = canvas.getAllByRole("combobox", {
      name: "Units",
    });
    expect(unitSelects.length).toBe(2);
    unitSelects.forEach((select) => {
      expect(select).toHaveTextContent("mg/kg");
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

    const variableSelect = canvas.getByRole("combobox", {
      name: "Variable",
    });
    expect(variableSelect).toBeInTheDocument();
    await userEvent.click(variableSelect);
    const listbox = await screen.findByRole("listbox");
    const observationOption = await within(listbox).findByRole("option", {
      name: "C1",
    });
    await userEvent.selectOptions(listbox, observationOption);
    expect(variableSelect).toHaveTextContent("C1");
    const unitSelect = canvas.getByRole("combobox", {
      name: "Units",
    });
    expect(unitSelect).toBeInTheDocument();
    expect(unitSelect).toHaveTextContent("mg/L");
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
