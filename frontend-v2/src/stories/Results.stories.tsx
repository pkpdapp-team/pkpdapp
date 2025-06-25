import { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { useDispatch } from "react-redux";
import { setProject as setReduxProject } from "../features/main/mainSlice";

import Results from "../features/results/Results";
import { project, projectHandlers } from "./project.mock";
import { simulationData } from "./simulations.mock";
import { http, delay, HttpResponse } from "msw";
import { SimulationContext } from "../contexts/SimulationContext";
import { dataset, subjects, biomarkerTypes } from "./dataset.mock";

const [simulation] = simulationData;
const simulationDataWithGroups = [simulation, simulation, simulation];

const datasetHandlers = [
  http.get("/api/dataset/:id", async () => {
    await delay();
    return HttpResponse.json(dataset, { status: 200 });
  }),
  http.get("/api/subject_group", async ({ request }) => {
    await delay();
    const url = new URL(request.url);
    const datasetId = url.searchParams.get("dataset_id");
    if (datasetId) {
      return HttpResponse.json(dataset.groups, { status: 200 });
    }
    return HttpResponse.json([], { status: 200 });
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

const resultsTables = [
  {
    id: 60,
    name: "Table 1",
    rows: "variables",
    columns: "parameters",
    filters: {
      parameterIndex: "columns",
      variableIndex: "rows",
      groupIndex: 0,
      intervalIndex: 0,
    },
    project: 57,
  },
];

let mockResultsTables = [...resultsTables];

const meta: Meta<typeof Results> = {
  title: "Results",
  component: Results,
  parameters: {
    layout: "fullscreen",
    msw: {
      handlers: {
        project: [
          ...projectHandlers,
          http.get("/api/results_table", async ({ request }) => {
            await delay();
            const url = new URL(request.url);
            const projectId = url.searchParams.get("project_id");
            if (!projectId) {
              return HttpResponse.json(
                { detail: "Project ID is required" },
                { status: 400 },
              );
            }
            // Simulate fetching results for the project
            return HttpResponse.json(mockResultsTables, { status: 200 });
          }),
          http.put("/api/results_table/:id", async ({ params, request }) => {
            await delay();
            //@ts-expect-error params.id is a string
            const tableId = parseInt(params.id, 10);
            const updatedTable = await request.json();
            // Simulate updating a results table
            const updatedTables = mockResultsTables.map((table) =>
              // @ts-expect-error updatedTable is DefaultBodyType
              table.id === tableId ? { ...table, ...updatedTable } : table,
            );
            const newTable = updatedTables.find(
              (table) => table.id === tableId,
            );
            return HttpResponse.json(newTable, { status: 200 });
          }),
          http.post("/api/results_table", async ({ request }) => {
            await delay();
            const newTable = await request.json();
            // Simulate creating a new results table
            const createdTable = {
              //@ts-expect-error newTable is DefaultBodyType
              ...newTable,
              id: mockResultsTables.length + 1, // Incremental ID for simplicity
            };
            mockResultsTables.push(createdTable);
            return HttpResponse.json(createdTable, { status: 201 });
          }),
          http.delete("/api/results_table/:id", async ({ params }) => {
            await delay();
            //@ts-expect-error params.id is a string
            const tableId = parseInt(params.id, 10);
            // Simulate deleting a results table
            mockResultsTables = mockResultsTables.filter(
              (table) => table.id !== tableId,
            );
            return HttpResponse.json(
              { message: "Table deleted" },
              { status: 200 },
            );
          }),
        ],
        dataset: datasetHandlers,
      },
    },
  },
  decorators: [
    (Story) => {
      const dispatch = useDispatch();
      dispatch(setReduxProject(project.id));
      const simulationContext = {
        simulations: simulationDataWithGroups,
        setSimulations: () => {},
      };
      return (
        <SimulationContext.Provider value={simulationContext}>
          <Story />
        </SimulationContext.Provider>
      );
    },
  ],
  beforeEach: () => {
    mockResultsTables = [...resultsTables]; // Reset mock data before each story
  },
};
export default meta;

type Story = StoryObj<typeof Results>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const resultsHeading = await canvas.findByRole("heading", {
      name: "Results",
    });
    expect(resultsHeading).toBeInTheDocument();

    const table1Tab = await canvas.findByRole("tab", {
      name: "Table 1",
    });
    expect(table1Tab).toBeInTheDocument();

    ["Columns", "Rows", "Group", "Interval"].forEach((name) => {
      const combobox = canvas.getByRole("combobox", {
        name,
      });
      expect(combobox).toBeInTheDocument();
    });

    const table = await canvas.findByRole("table", {
      name: "Results table",
    });
    expect(table).toBeInTheDocument();
  },
};

export const AddNewTable: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    const table1Tab = await canvas.findByRole("tab", {
      name: "Table 1",
    });
    expect(table1Tab).toBeInTheDocument();

    const addButton = await canvas.findByRole("button", {
      name: /Add Table/i,
    });
    expect(addButton).toBeInTheDocument();

    await userEvent.click(addButton);

    const newTableTab = await canvas.findByRole("tab", {
      name: "Table 2",
    });
    expect(newTableTab).toBeInTheDocument();

    const newTable = await canvas.findByRole("table", {
      name: "Results table",
    });
    expect(newTable).toBeInTheDocument();
  },
};
