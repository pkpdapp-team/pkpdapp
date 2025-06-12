import { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within, screen } from "storybook/test";
import { useDispatch } from "react-redux";
import { setProject as setReduxProject } from "../features/main/mainSlice";

import Results from "../features/results/Results";
import { project, projectHandlers } from "./project.mock";
import { simulationData } from "./simulations.mock";
import { http, delay, HttpResponse } from "msw";
import { SimulationContext } from "../contexts/SimulationContext";

const meta: Meta<typeof Results> = {
  title: "Results",
  component: Results,
  parameters: {
    layout: "fullscreen",
    msw: {
      handlers: [
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
          return HttpResponse.json(
            [
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
            ],
            { status: 200 },
          );
        }),
      ],
    },
  },
  decorators: [
    (Story) => {
      const dispatch = useDispatch();
      dispatch(setReduxProject(project.id));
      const simulationContext = {
        simulations: simulationData,
        setSimulations: () => {},
      };
      return (
        <SimulationContext.Provider value={simulationContext}>
          <Story />
        </SimulationContext.Provider>
      );
    },
  ],
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
      const combobox = screen.getByRole("combobox", {
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
