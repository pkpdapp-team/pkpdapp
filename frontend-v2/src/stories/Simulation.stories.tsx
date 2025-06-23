import { Meta, StoryObj } from "@storybook/react-vite";
import { delay, http, HttpResponse } from "msw";
import { expect, fn, screen, waitFor, within } from "storybook/test";
import { useDispatch } from "react-redux";
import {
  setProject as setReduxProject,
  PageName,
  setPage,
} from "../features/main/mainSlice";
import { project, projectHandlers } from "./project.mock";
import { simulationData } from "./simulations.mock";

import Simulations from "../features/simulation/Simulations";
import { Box } from "@mui/material";

const simulationSpy = fn();

const meta: Meta<typeof Simulations> = {
  title: "Simulations",
  component: Simulations,
  args: {
    updateSimulations: simulationSpy,
  },
  parameters: {
    layout: "fullscreen",
    msw: {
      handlers: [
        ...projectHandlers,
        http.get("/api/subject_group", async () => {
          await delay();
          return HttpResponse.json([], { status: 200 });
        }),
        http.post("/api/combined_model/:id/simulate", async ({ request }) => {
          await delay();
          const simulationParams = await request.json();
          simulationSpy(simulationParams);
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
          <Box width="100%">
            <Story />
          </Box>
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
      expanded: false,
    });
    expect(parametersButton).toBeInTheDocument();
    await userEvent.click(parametersButton);
    expect(parametersButton).toHaveAttribute("aria-expanded", "true");

    const addParameterButton = await canvas.findByRole("button", {
      name: /Add parameter/i,
    });
    await userEvent.click(addParameterButton);

    const parameterOption = await screen.findByRole("button", {
      name: /^V1/,
    });
    await userEvent.click(parameterOption);

    const simulationSlider = await screen.findByRole("slider", {
      name: "V1 [mL/kg]",
    });
    expect(simulationSlider).toBeInTheDocument();

    const inputField = await screen.findByRole("spinbutton", {
      name: "V1 [mL/kg]",
    });
    expect(inputField).toBeInTheDocument();
    await userEvent.click(inputField);
    expect(inputField).toHaveFocus();
    await userEvent.keyboard("{backspace>6}");
    await userEvent.type(inputField, "100");
    await userEvent.tab();

    await waitFor(() => {
      const [simulationParams] = simulationSpy.mock.lastCall || [];
      expect(simulationParams.variables["PKCompartment.V1"]).toBe(100);
    });
  },
};

export const AddNewPlot: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    const addPlotButton = await canvas.findByRole("button", {
      name: "Add new plot",
    });
    expect(addPlotButton).toBeInTheDocument();
    await userEvent.click(addPlotButton);

    const variableButton = await screen.findByRole("button", {
      name: /^A1/,
    });
    expect(variableButton).toBeInTheDocument();
    await userEvent.click(variableButton);
  },
};

export const EditPlot: Story = {
  play: async ({ canvasElement, userEvent }) => {
    // Wait for Plotly to load the plots.
    await delay(2000);
    const plot = canvasElement.querySelector("svg.main-svg");
    expect(plot).toBeInTheDocument();
    const dragLayer = plot?.querySelector("rect.drag");
    await userEvent.hover(dragLayer!);
    const editButton = canvasElement.querySelector(
      'a[data-title="Customise Plot"]',
    );
    expect(editButton).toBeInTheDocument();
    await userEvent.click(editButton!);

    const customisePlotHeading = await screen.findByRole("heading", {
      name: "Customise Plot",
    });
    expect(customisePlotHeading).toBeInTheDocument();

    const xAxisLabelSearchbox = screen.getByRole("searchbox", {
      name: "X Axis Label",
    });
    expect(xAxisLabelSearchbox).toBeInTheDocument();
    expect(xAxisLabelSearchbox).toHaveValue("Time  [h]");

    const yAxisLabelSearchbox = screen.getByRole("searchbox", {
      name: "Y Axis Label",
    });
    expect(yAxisLabelSearchbox).toBeInTheDocument();
    expect(yAxisLabelSearchbox).toHaveValue("C1  [pmol/L]");
  },
};
