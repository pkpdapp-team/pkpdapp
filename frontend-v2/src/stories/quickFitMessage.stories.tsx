import { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import {
  buildQuickFitMessage,
  isQuickFitMessage,
  quickFitMessageText,
} from "../features/simulation/quickFitMessage";
import {
  BiomarkerTypeRead,
  Optimise,
  OptimiseResponse,
  SubjectGroupRead,
  UnitRead,
  VariableRead,
} from "../app/backendApi";

// no UI; tests the message "Discuss with AI" sends to the chat
const QuickFitMessageTests = () => <div>Quick fit message tests</div>;

const meta: Meta<typeof QuickFitMessageTests> = {
  title: "Optimise/Quick Fit Message",
  component: QuickFitMessageTests,
};

export default meta;
type Story = StoryObj<typeof meta>;

const variables = [
  { id: 1, name: "CL", unit: 10 },
  { id: 2, name: "V", unit: 11 },
  { id: 3, name: "C1", description: "central concentration" },
] as VariableRead[];

const units = [
  { id: 10, symbol: "L/h" },
  { id: 11, symbol: "L" },
] as UnitRead[];

const biomarkerTypes = [{ id: 20, name: "conc", variable: 3 }] as BiomarkerTypeRead[];

const groups = [{ id: 30, name: "Group 1" }] as SubjectGroupRead[];

// CL: SE 0.2 → 10% RSE, V: SE 10 → 100% RSE and at its upper bound,
// CL–V correlation 0.5 / (0.2 × 10) = 0.25
const result: OptimiseResponse = {
  optimal: [2, 10],
  inputs: [1, 2],
  starting: [1, 5],
  bounds: [
    [0.1, 1],
    [100, 10],
  ],
  covariance: [
    [0.04, 0.5],
    [0.5, 100],
  ],
  noise_models: ["additive"],
  biomarker_types: [20],
  subject_groups: [30],
  sigma_variables: [3],
  sigma: [0.5],
  sigma_start: [0.1],
  sigma_bounds: [[0.01, 1]],
  sigma_use_log_space: [true],
  sigma_mult: null,
  sigma_mult_start: null,
  sigma_bounds_mult: null,
  sigma_mult_use_log_space: null,
  method: "pso",
  reason: "converged",
  loss: 1,
  neg2ll: 12,
  aic: 20,
  bic: 22,
  condition_number: 50,
  predictions: null,
  residuals: null,
  observations: null,
};

const request: Optimise = {
  inputs: [1, 2],
  starting: [1, 5],
  bounds: result.bounds,
  use_log_space: [true, false],
};

export const BuildsTheDialogResults: Story = {
  play: async () => {
    const message = buildQuickFitMessage(
      result,
      request,
      variables,
      units,
      biomarkerTypes,
      groups,
    );

    expect(message.summary.aic).toBe(20);
    expect(message.inputs.observations).toEqual(["C1 (central concentration)"]);
    expect(message.inputs.subject_groups).toEqual(["Group 1"]);
    expect(message.inputs.parameters[0]).toMatchObject({
      name: "CL",
      unit: "L/h",
      optimal: 2,
      log_space: true,
      near_bound: false,
    });
    expect(message.inputs.parameters[0].rse_percent).toBeCloseTo(10);
    expect(message.inputs.parameters[1]).toMatchObject({ name: "V", near_bound: true });
    expect(message.inputs.noise[0]).toMatchObject({
      output: "C1",
      noise_model: "additive",
      sigma_proportional: null,
    });
    expect(message.uncertainty.correlations).toHaveLength(1);
    expect(message.uncertainty.correlations[0].r).toBeCloseTo(0.25);
  },
};

export const SendsHeaderAndJson: Story = {
  play: async () => {
    const message = buildQuickFitMessage(
      result,
      request,
      variables,
      units,
      biomarkerTypes,
      groups,
    );
    const text = quickFitMessageText(message);

    expect(text.split("\n")[0]).toBe("[OPTIMISATION RESULTS]");
    expect(JSON.parse(text.split("\n")[1])).toEqual(message);
    expect(isQuickFitMessage(text)).toBe(true);
    expect(isQuickFitMessage("What does the AIC mean?")).toBe(false);
  },
};
