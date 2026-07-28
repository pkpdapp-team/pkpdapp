import { Meta, StoryObj } from "@storybook/react-vite";
import { delay, http, HttpResponse } from "msw";
import { expect, fn, screen, waitFor } from "storybook/test";
import { useDispatch } from "react-redux";
import {
  setProject as setReduxProject,
  PageName,
  setPage,
} from "../features/main/mainSlice";

import Simulations from "../features/simulation/Simulations";
import { Box } from "@mui/material";
import { Optimise } from "../app/backendApi";
import { simulationData } from "./simulations.mock";
// Mocks WITH dataset data (so the simulation page has observations and the
// optimisation gear button / Fit button are enabled).
import {
  project,
  simulations,
  variables,
  projectHandlers,
  modelHandlers,
  protocolHandlers,
  unitHandlers,
  variableHandlers,
  datasetHandlers,
  subjectHandlers,
  subjectGroupHandlers,
  biomarkerTypeHandlers,
} from "./generated-mocks-with-data";

const optimiseSpy = fn();

// Echo the requested optimise inputs back as a successful result. Returns one
// optimal value per input so the response matches the selected sliders.
const optimiseHandler = http.post(
  "/api/combined_model/:id/optimise",
  async ({ request }) => {
    await delay(250);
    const optimiseParams = (await request.json()) as Optimise;
    optimiseSpy(optimiseParams);
    return HttpResponse.json(
      {
        optimal: optimiseParams.inputs.map(() => 2.5),
        loss: 0.01234,
        reason: "Stopped after 8 iterations.",
        inputs: optimiseParams.inputs,
        starting: optimiseParams.starting,
        bounds: optimiseParams.bounds,
        biomarker_types: optimiseParams.biomarker_types || [],
        subject_groups: optimiseParams.subject_groups || [],
        max_iterations: optimiseParams.max_iterations || null,
        noise_models: optimiseParams.noise_models ?? [],
        method: optimiseParams.method || "pso",
        predictions: null,
        residuals: null,
        covariance: null,
        condition_number: null,
      },
      { status: 200 },
    );
  },
);

const simulateHandler = http.post(
  "/api/combined_model/:id/simulate",
  async () => {
    return HttpResponse.json(simulationData, { status: 200 });
  },
);

// Build a GET /api/simulation handler returning the given simulation, filtered
// by project_id the same way the generated handler does.
const simulationListHandler = (simulation: (typeof simulations)[number]) =>
  http.get("/api/simulation/", async ({ request }) => {
    const url = new URL(request.url);
    const projectId = url.searchParams.get("project_id");
    if (projectId && simulation.project !== Number(projectId)) {
      return HttpResponse.json([], { status: 200 });
    }
    return HttpResponse.json([simulation], { status: 200 });
  });

// Base handlers shared by all stories: everything from the generated mocks plus
// a simulate endpoint (the generated mocks only provide GET /api/simulation).
// The GET /api/simulation handler is intentionally left out here so each story
// can supply its own simulation (with or without preconfigured sliders) without
// the generated handler taking precedence (MSW resolves array handlers in order).
const baseHandlers = [
  ...projectHandlers,
  ...modelHandlers,
  ...protocolHandlers,
  ...unitHandlers,
  ...variableHandlers,
  ...datasetHandlers,
  ...subjectHandlers,
  ...subjectGroupHandlers,
  ...biomarkerTypeHandlers,
  simulateHandler,
];

// Derive the expected Start/Min/Max for each seeded slider directly from the
// generated mock data, mirroring the rules in useSliderSettings.ts. This keeps
// the test correct even after the mocks are regenerated (ids/values may churn).
const SLIDER_RANGE = 10;
const expectedSliders = simulations[0].sliders.map((slider) => {
  const variable = variables.find((v) => v.id === slider.variable);
  const start = variable?.default_value ?? 1;
  const min = variable?.lower_bound ?? start / SLIDER_RANGE;
  const max =
    variable?.upper_bound ?? (start === 0 ? SLIDER_RANGE : start * SLIDER_RANGE);
  // Log space is the default only when the lower bound is non-negative AND the
  // variable has no fixed upper bound set in the database (mirrors the rule in
  // getDefaultOptimiseInputs). A fixed upper bound defaults to linear space.
  const logScale =
    min >= 0 &&
    (variable?.upper_bound === undefined || variable?.upper_bound === null);
  return { variable, start, min, max, logScale };
});

const meta: Meta<typeof Simulations> = {
  title: "Optimise",
  component: Simulations,
  parameters: {
    layout: "fullscreen",
    msw: {
      handlers: [...baseHandlers, simulationListHandler(simulations[0])],
    },
  },
  decorators: [
    (Story) => {
      const dispatch = useDispatch();
      dispatch(setReduxProject(project.id));
      dispatch(setPage(PageName.SIMULATIONS));

      return (
        <Box sx={{ display: "flex" }}>
          <Box
            component="nav"
            sx={{
              width: { sm: 240 },
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

export const OpenSettings: Story = {
  play: async ({ userEvent }) => {
    await screen.findByRole("heading", { name: "Simulations" });

    // The sliders and optimisation controls live inside the collapsible
    // "Parameters" section, which is collapsed by default. Expand it first.
    const parametersButton = await screen.findByRole("button", {
      name: new RegExp(`^Parameters ${expectedSliders.length}`),
    });
    await userEvent.click(parametersButton);

    // Open the Optimisation Settings dialog via the gear button. The button is
    // only enabled once there are sliders and the dataset has observations.
    const settingsButton = await screen.findByRole("button", {
      name: "Open optimisation settings",
    });
    await waitFor(() => expect(settingsButton).toBeEnabled(), {
      timeout: 10000,
    });
    await userEvent.click(settingsButton);

    const dialogHeading = await screen.findByRole("heading", {
      name: "Optimisation Settings",
    });
    expect(dialogHeading).toBeInTheDocument();

    // Each seeded slider variable should be listed in the dialog.
    for (const { variable } of expectedSliders) {
      const heading = await screen.findByRole("heading", {
        name: new RegExp(`^${variable?.name}`),
      });
      expect(heading).toBeInTheDocument();
    }

    // "Start" is unique per slider row; "Min bound"/"Max bound" labels repeat
    // (the noise sigma section appends one extra pair at the end), so assert
    // only the first sliders.length entries against the computed values.
    const startFields = screen.getAllByRole("spinbutton", { name: "Start" });
    const minFields = screen.getAllByRole("spinbutton", { name: "Min bound" });
    const maxFields = screen.getAllByRole("spinbutton", { name: "Max bound" });

    expect(startFields).toHaveLength(expectedSliders.length);
    expect(minFields.length).toBeGreaterThanOrEqual(expectedSliders.length);
    expect(maxFields.length).toBeGreaterThanOrEqual(expectedSliders.length);

    expectedSliders.forEach(({ start, min, max }, index) => {
      expect(startFields[index]).toHaveValue(start);
      expect(minFields[index]).toHaveValue(min);
      expect(maxFields[index]).toHaveValue(max);
    });

    // Each slider row has a "Log scale" checkbox. Parameters with a fixed upper
    // bound in the database default to linear (unchecked); others default to log
    // (checked). The first sliders.length checkboxes are the slider rows; the
    // per-observation sigma rows append more after them.
    const logScaleChecks = screen.getAllByRole("checkbox", {
      name: "Log scale",
    });
    expect(logScaleChecks.length).toBeGreaterThanOrEqual(expectedSliders.length);
    expectedSliders.forEach(({ logScale }, index) => {
      expect(logScaleChecks[index]).toHaveProperty("checked", logScale);
    });

    // The custom optimise action should be available.
    const optimiseButton = screen.getByRole("button", { name: "Optimise" });
    expect(optimiseButton).toBeInTheDocument();
  },
};

// A simulation with no preconfigured sliders, so the "Add parameter" flow in
// the story below produces exactly one slider to optimise.
const simulationNoSliders = { ...simulations[0], sliders: [] };

export const OptimiseSingleParameter: Story = {
  parameters: {
    msw: {
      handlers: [
        // Story-level array handlers replace (not merge with) the meta array,
        // so re-list the base handlers and swap in a slider-free simulation
        // plus the optimise endpoint.
        ...baseHandlers,
        simulationListHandler(simulationNoSliders),
        optimiseHandler,
      ],
    },
  },
  play: async ({ userEvent }) => {
    optimiseSpy.mockClear();

    await screen.findByRole("heading", { name: "Simulations" });

    // Expand the (empty) Parameters section and add a single parameter (V1).
    const parametersButton = await screen.findByRole("button", {
      name: "Parameters 0",
    });
    await userEvent.click(parametersButton);

    const addParameterButton = await screen.findByRole("button", {
      name: /Add parameter/i,
    });
    await userEvent.click(addParameterButton);

    const parameterOption = await screen.findByRole("button", {
      name: /^V1/,
    });
    await userEvent.click(parameterOption);

    // Run the optimisation via the Fit button.
    const optimiseButton = await screen.findByRole("button", { name: "Fit" });
    await waitFor(() => expect(optimiseButton).toBeEnabled());
    await userEvent.click(optimiseButton);

    const loadingIndicator = await screen.findByRole("progressbar");
    expect(loadingIndicator).toBeInTheDocument();

    const successAlert = await screen.findByRole("alert", { name: "" });
    await waitFor(() => {
      const [optimiseParams] = optimiseSpy.mock.lastCall || [];
      expect(optimiseParams.inputs).toHaveLength(1);
      expect(typeof optimiseParams.inputs[0]).toBe("number");
      expect(optimiseParams.starting).toHaveLength(1);
      expect(optimiseParams.bounds).toHaveLength(2);
      expect(optimiseParams.bounds[0]).toHaveLength(1);
      expect(optimiseParams.bounds[1]).toHaveLength(1);
      expect(optimiseParams.bounds[0][0]).toBeLessThan(
        optimiseParams.bounds[1][0],
      );
      expect(optimiseParams.starting[0]).toBeGreaterThanOrEqual(
        optimiseParams.bounds[0][0],
      );
      expect(optimiseParams.starting[0]).toBeLessThanOrEqual(
        optimiseParams.bounds[1][0],
      );
    });
    expect(successAlert).toHaveTextContent(
      "Optimisation complete. Objective: 0.0123. Stopped after 8 iterations.",
    );

    // The optimised value should be written back to the slider input.
    const inputField = await screen.findByRole("spinbutton", {
      name: /^V1/,
    });
    await waitFor(() => {
      expect(inputField).toHaveValue(2.5);
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });
  },
};

// Each fitted observation has its own noise-model dropdown; selecting "Combined"
// for one sends that per-observation model plus the proportional sigma arrays.
export const OptimisePerObservationNoiseModel: Story = {
  parameters: {
    msw: {
      handlers: [
        ...baseHandlers,
        simulationListHandler(simulations[0]),
        optimiseHandler,
      ],
    },
  },
  play: async ({ userEvent }) => {
    optimiseSpy.mockClear();

    await screen.findByRole("heading", { name: "Simulations" });

    const parametersButton = await screen.findByRole("button", {
      name: new RegExp(`^Parameters ${expectedSliders.length}`),
    });
    await userEvent.click(parametersButton);

    const settingsButton = await screen.findByRole("button", {
      name: "Open optimisation settings",
    });
    await waitFor(() => expect(settingsButton).toBeEnabled(), {
      timeout: 10000,
    });
    await userEvent.click(settingsButton);

    await screen.findByRole("heading", { name: "Optimisation Settings" });

    // Set the first observation's noise model to Combined.
    const noiseSelects = await screen.findAllByRole("combobox", {
      name: "Noise model",
    });
    expect(noiseSelects.length).toBeGreaterThan(0);
    await userEvent.click(noiseSelects[0]);
    const combinedOption = await screen.findByRole("option", {
      name: "Combined",
    });
    await userEvent.click(combinedOption);

    await userEvent.click(
      screen.getByRole("button", { name: "Optimise" }),
    );

    await waitFor(() => {
      const [optimiseParams] = optimiseSpy.mock.lastCall || [];
      expect(optimiseParams).toBeTruthy();
      expect(optimiseParams.noise_models).toContain("combined");
      // A combined observation also sends the proportional sigma arrays.
      expect(optimiseParams.sigma_mult_start).toBeTruthy();
    });
  },
};
