import { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor, within } from "storybook/test";
import { useDispatch } from "react-redux";
import { setProject as setReduxProject } from "../features/main/mainSlice";

import Data from "../features/data/Data";
import { projectHandlers } from "./project.mock";

import { HttpResponse, delay, http } from "msw";
import {
  biomarkerTypes,
  dataset,
  project,
  protocols,
  subjects,
} from "./dataset.mock";

const datasetHandlers = [
  http.get("/api/dataset/:id", async () => {
    await delay();
    return HttpResponse.json(dataset, { status: 200 });
  }),
  http.get("/api/subject_group", async () => {
    await delay();
    return HttpResponse.json(dataset.groups, { status: 200 });
  }),
  http.get("/api/subject", async () => {
    await delay();
    return HttpResponse.json(subjects, { status: 200 });
  }),
  http.get("/api/biomarker_type", async () => {
    await delay();
    return HttpResponse.json(biomarkerTypes, { status: 200 });
  }),
];

const meta: Meta<typeof Data> = {
  title: "Data Upload (edit dataset)",
  component: Data,
  parameters: {
    layout: "fullscreen",
    msw: {
      handlers: {
        project: [
          http.get("/api/project/:id", async () => {
            await delay();
            return HttpResponse.json(project, { status: 200 });
          }),
          http.get("/api/protocol", async () => {
            await delay();
            return HttpResponse.json(protocols, { status: 200 });
          }),
          ...projectHandlers,
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

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const newDatasetButton = await canvas.findByRole("button", {
      name: /New Dataset/i,
    });
    expect(newDatasetButton).toBeInTheDocument();
    const editDatasetButton = await canvas.findByRole("button", {
      name: /Edit Dataset/i,
    });
    expect(editDatasetButton).toBeInTheDocument();
    const downloadCSVButton = await canvas.findByRole("button", {
      name: /Download CSV/i,
    });
    expect(downloadCSVButton).toBeInTheDocument();
    const downloadNONMEMButton = await canvas.findByRole("button", {
      name: /Download NONMEM/i,
    });
    expect(downloadNONMEMButton).toBeInTheDocument();

    const groupTabs = await canvas.findAllByRole("tab", {
      name: /Group \w+/i,
    });
    expect(groupTabs.length).toBe(2);

    const protocolsHeading = await canvas.findByRole("heading", {
      name: "Protocols",
    });
    expect(protocolsHeading).toBeInTheDocument();
    const protocolsGrid = await canvas.findByRole("grid", {
      name: "Protocols",
    });
    expect(protocolsGrid).toBeInTheDocument();

    const observationsHeading = await canvas.findByRole("heading", {
      name: "Observations",
    });
    expect(observationsHeading).toBeInTheDocument();
    const observationsGrid = canvas.getByRole("grid", {
      name: "Observations",
    });
    expect(observationsGrid).toBeInTheDocument();
  },
};

export const EditDataset: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);

    const editDatasetButton = await canvas.findByRole("button", {
      name: /Edit Dataset/i,
    });
    expect(editDatasetButton).toBeInTheDocument();
    await userEvent.click(editDatasetButton);

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
    expect(rows.length).toBe(51); // 50 data rows + 1 header row
  },
};

export const MapDosing: Story = {
  play: async ({ context, canvasElement, userEvent }) => {
    const canvas = within(canvasElement);

    await EditDataset.play?.(context);

    const mapDosingButton = await canvas.findByRole("button", {
      name: /Map Dosing/i,
    });
    expect(mapDosingButton).toBeInTheDocument();
    await userEvent.click(mapDosingButton);

    const mapDosingHeading = await canvas.findByRole("heading", {
      name: "Dosing",
    });
    expect(mapDosingHeading).toBeInTheDocument();

    const mapDosingTable = await canvas.findByRole("table", {
      name: "Dosing",
    });
    expect(mapDosingTable).toBeInTheDocument();
  },
};

export const MapObservations: Story = {
  play: async ({ context, canvasElement, userEvent }) => {
    const canvas = within(canvasElement);

    await EditDataset.play?.(context);

    const mapObservationsButton = await canvas.findByRole("button", {
      name: /Map Observations/i,
    });
    expect(mapObservationsButton).toBeInTheDocument();
    await userEvent.click(mapObservationsButton);

    const mapObservationsHeading = await canvas.findByRole("heading", {
      name: "Observations",
    });
    expect(mapObservationsHeading).toBeInTheDocument();

    const groupsHeading = await canvas.findByRole("heading", {
      name: "Groups",
    });
    expect(groupsHeading).toBeInTheDocument();

    const variableSelects = await canvas.findAllByRole("combobox", {
      name: "Variable",
    });
    expect(variableSelects).toHaveLength(2);
    await waitFor(() => {
      expect(variableSelects[0]).toHaveTextContent("C1");
      expect(variableSelects[1]).toHaveTextContent("E");
    });

    const groupTabs = canvas.getAllByRole("tab", {
      name: /Group \w+/i,
    });
    expect(groupTabs.length).toBe(2);

    const groupDataGrid = canvas.getByRole("grid", {
      name: "Group IV",
    });
    expect(groupDataGrid).toBeInTheDocument();
  },
};
