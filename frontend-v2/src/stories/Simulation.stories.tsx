import { Meta, StoryObj } from "@storybook/react-vite";
import { delay, http, HttpResponse } from "msw";
import { expect, screen, within } from "storybook/test";
import { useDispatch } from "react-redux";
import {
  setProject as setReduxProject,
  PageName,
  setPage,
} from "../features/main/mainSlice";
import { project, projectHandlers, variables } from "./project.mock";
import { simulationData } from "./simulations.mock";

import Simulations from "../features/simulation/Simulations";
import { Box } from "@mui/material";

const meta: Meta<typeof Simulations> = {
  title: "Simulations",
  component: Simulations,
  parameters: {
    layout: "fullscreen",
    msw: {
      handlers: [
        ...projectHandlers,
        http.get("/api/subject_group", async () => {
          await delay();
          return HttpResponse.json([], { status: 200 });
        }),
        http.get("/api/variable/:id", async ({ params }) => {
          await delay();
          //@ts-expect-error params.id is a string
          const variableId = parseInt(params.id, 10);
          const variable = variables.find((v) => v.id === variableId);
          if (!variable) {
            return HttpResponse.json(
              { detail: "Variable not found" },
              { status: 404 },
            );
          }
          return HttpResponse.json(variable, { status: 200 });
        }),
        http.put("/api/simulation/:id", async ({ params, request }) => {
          await delay();
          //@ts-expect-error params.id is a string
          const simulationId = parseInt(params.id, 10);
          const simulationData = await request.json();
          return HttpResponse.json(
            //@ts-expect-error simulationData is DefaultBodyType
            { ...simulationData, id: simulationId },
            {
              status: 200,
            },
          );
        }),
        http.post("/api/combined_model/:id/simulate", async () => {
          await delay();
          return HttpResponse.json(simulationData, {
            status: 200,
          });
        }),
      ],
    },
  },
  decorators: [
    (Story) => {
      const dispatch = useDispatch();
      const projectId = project.id;

      dispatch(setReduxProject(projectId));
      dispatch(setPage(PageName.SIMULATIONS));

      return (
        <Box sx={{ display: "flex" }}>
          <Box
            component="nav"
            sx={{
              width: {
                sm: 240,
              },
              flexShrink: { sm: 0 },
              height: "100vh",
            }}
            aria-label="simulations sidebar"
            id="simulations-portal"
          />
          <Story />
        </Box>
      );
    },
  ],
};

export default meta;

type Story = StoryObj<typeof Simulations>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const simulationsHeading = await canvas.findByRole("heading", {
      name: "Simulations",
    });
    expect(simulationsHeading).toBeInTheDocument();
  },
};

export const Parameters: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    const parametersButton = await canvas.findByRole("button", {
      name: "Parameters 0",
    });
    expect(parametersButton).toBeInTheDocument();
    await userEvent.click(parametersButton);

    const addParameterButton = await canvas.findByRole("button", {
      name: /Add parameter/i,
    });
    await userEvent.click(addParameterButton);

    const parameterOption = await screen.findByRole("button", {
      name: /^V1/,
    });
    await userEvent.click(parameterOption);
  },
};
