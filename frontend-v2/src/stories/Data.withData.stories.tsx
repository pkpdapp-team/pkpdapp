import { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { useDispatch } from "react-redux";
import { setProject as setReduxProject } from "../features/main/mainSlice";

import Data from "../features/data/Data";
import { projectHandlers } from "./project.mock";

import { HttpResponse, http } from "msw";
import { biomarkerTypes, dataset, project, subjects } from "./dataset.mock";

const datasetHandlers = [
  http.get("/api/dataset/:id", () => {
    return HttpResponse.json(dataset, { status: 200 });
  }),
  http.get("/api/subject_group", ({ request }) => {
    const url = new URL(request.url);
    const datasetId = url.searchParams.get("dataset_id");
    console.log("datasetId", datasetId);
    return HttpResponse.json(dataset.groups, { status: 200 });
  }),
  http.get("/api/subject", () => {
    return HttpResponse.json(subjects, { status: 200 });
  }),
  http.get("/api/biomarker_type", () => {
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
          http.get("/api/project/:id", () => {
            return HttpResponse.json(project, { status: 200 });
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

    const groupTabs = canvas.getAllByRole("tab", {
      name: /Group \d+/i,
    });
    expect(groupTabs.length).toBe(3);

    const protocolsHeading = await canvas.findByRole("heading", {
      name: "Protocols",
    });
    expect(protocolsHeading).toBeInTheDocument();
    const protocolsGrid = canvas.getByRole("grid", {
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
