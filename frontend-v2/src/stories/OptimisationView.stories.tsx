import { expect, fn, screen, within } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/react-vite";

import OptimisationView from "../features/simulation/OptimisationView";
import {
  CombinedModelRead,
  CompoundRead,
  OptimiseResponse,
  VariableRead,
} from "../app/backendApi";

const variables = [
  { id: 1, name: "CL" },
  { id: 2, name: "V" },
  { id: 3, name: "KA" },
  { id: 4, name: "C1" },
] as VariableRead[];

// a made-up fit with easy numbers: one case per display rule
const optimiseResult: OptimiseResponse = {
  optimal: [2, 10, 0],
  inputs: [1, 2, 3],
  starting: [1, 5, 0.5],
  bounds: [
    [0.1, 1, 0],
    [100, 10, 1],
  ],
  covariance: [
    [0.04, 0.5, 0],
    [0.5, 100, 0],
    [0, 0, 1],
  ],
  noise_models: ["combined"],
  sigma_variables: [4],
  sigma: [0.5],
  sigma_start: [0.1],
  sigma_bounds: [[0.01, 1]],
  sigma_use_log_space: [true],
  sigma_mult: [1],
  sigma_mult_start: [0.1],
  sigma_bounds_mult: [[0.01, 1]],
  sigma_mult_use_log_space: [true],
  method: "pso",
  reason: "converged",
  loss: 1,
  neg2ll: 12,
  // k = 5 (3 parameters + 2 sigmas), n = 10: AIC = 12 + 2k, BIC = 12 + k·ln(n)
  aic: 22,
  bic: 23.51,
  // largest / smallest eigenvalue of the correlation matrix: 1.25 / 0.75
  condition_number: 1.67,
  predictions: null,
  residuals: null,
  observations: null,
};

const meta = {
  title: "Optimise/Result Dialog",
  component: OptimisationView,
  args: {
    open: true,
    onClose: fn(),
    optimiseResult,
    variables,
    units: [],
    groups: [],
    biomarkerTypes: [],
    subjectBiomarkers: [],
    model: {} as CombinedModelRead,
    compound: {} as CompoundRead,
    visibleGroups: [],
    plots: [],
  },
} satisfies Meta<typeof OptimisationView>;

export default meta;

type Story = StoryObj<typeof meta>;

const OPTIMAL_COLUMN = 4;

// CL, V and KA also label the covariance table's rows, so search the inputs table
function optimalCell(rowLabel: string) {
  const inputsTable = screen
    .getByRole("columnheader", { name: "Optimal" })
    .closest("table")!;
  const row = within(inputsTable)
    .getByRole("cell", { name: rowLabel })
    .closest("tr")!;
  return within(row).getAllByRole("cell")[OPTIMAL_COLUMN];
}

function isHighlighted(cell: HTMLElement) {
  return getComputedStyle(cell).fontWeight === "700";
}

export const ShowsUncertaintyAndBoundWarnings: Story = {
  play: async () => {
    await screen.findByRole("heading", { name: "Last Optimisation Result" });

    // %RSE = SE / optimal on the diagonal, SE = √variance
    // CL: √0.04 / 2
    expect(screen.getByText("10.0%")).toBeInTheDocument();
    // V: √100 / 10
    expect(screen.getByText("100.0%")).toBeInTheDocument();
    // KA: optimal 0, no %RSE
    expect(screen.getByText("—")).toBeInTheDocument();

    // correlation = covariance / (SE × SE) off the diagonal
    // CL–V: 0.5 / (0.2 × 10), on both sides of the diagonal
    expect(screen.getAllByText("0.250")).toHaveLength(2);
    // the other pairs are uncorrelated
    expect(screen.getAllByText("0.000")).toHaveLength(4);

    // optimal values at or near a bound are bold
    // CL: 2, well inside 0.1–100
    expect(isHighlighted(optimalCell("CL"))).toBe(false);
    // V: 10, at its upper bound
    expect(isHighlighted(optimalCell("V"))).toBe(true);
    // KA: 0, at its lower bound
    expect(isHighlighted(optimalCell("KA"))).toBe(true);
    // additive sigma: 0.5, inside 0.01–1
    expect(isHighlighted(optimalCell("Sigma additive (C1) [combined, log]"))).toBe(false);
    // proportional sigma: 1, at its upper bound
    expect(isHighlighted(optimalCell("Sigma proportional (C1) [log]"))).toBe(true);
  },
};
