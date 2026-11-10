import { expect, screen, within } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/react-vite";

import OptimisationResidualStatsTable from "../features/simulation/OptimisationResidualStatsTable";
import { VariableRead } from "../app/backendApi";

const variables = [
  { id: 1, name: "CL" },
  { id: 2, name: "V" },
  { id: 3, name: "KA" },
] as VariableRead[];

// Three outputs, each crafted to exercise one behaviour of the table:
//  - CL: a clean fit, every statistic in the green band
//  - V:  a mix of amber / red / null (—) cells
//  - KA: too few points (n < 30) so it is flagged unreliable
const summaryStatistics = [
  {
    variable: 1, // CL — all green
    n: 100,
    reliable: true,
    mean: 0.05,
    sd: 1.0,
    rmse: 1.0,
    skewness: 0.1,
    kurtosis: 0.2,
    normality_p: 0.8,
    pct_within_1_96: 96,
    n_outliers: 0,
    corr_time: 0.05,
    corr_predicted: 0.1,
    r_squared: 0.95,
    ccc: 0.95,
  },
  {
    variable: 2, // V — mixed: amber mean, red rmse, null skewness
    n: 100,
    reliable: true,
    mean: 0.2,
    sd: 0.6,
    rmse: 1.8,
    skewness: null,
    kurtosis: 1.5,
    normality_p: 0.02,
    pct_within_1_96: 91,
    n_outliers: 4,
    corr_time: 0.3,
    corr_predicted: 0.5,
    r_squared: 0.8,
    ccc: 0.7,
  },
  {
    variable: 3, // KA — unreliable (small sample)
    n: 5,
    reliable: false,
    mean: 5.0, // would be red if classified, but must stay uncoloured
    sd: 0.1,
    rmse: 3.0,
    skewness: 2.0,
    kurtosis: 5.0,
    normality_p: 0.0001,
    pct_within_1_96: 40,
    n_outliers: 3,
    corr_time: 0.9,
    corr_predicted: 0.9,
    r_squared: 0.1,
    ccc: 0.1,
  },
];

const meta = {
  title: "Optimise/Residual Summary Statistics",
  component: OptimisationResidualStatsTable,
  args: {
    summaryStatistics,
    variables,
  },
} satisfies Meta<typeof OptimisationResidualStatsTable>;

export default meta;

type Story = StoryObj<typeof meta>;

// Traffic-light background colours, as computed rgb(...) strings.
const GREEN = "rgb(200, 230, 201)";
const AMBER = "rgb(255, 249, 196)";
const RED = "rgb(255, 205, 210)";
const GREY = "rgb(245, 245, 245)";
const UNCOLOURED = "rgba(0, 0, 0, 0)";

// Column index within a body row: cell 0 is the variable-name label, then one
// cell per statistic in the table's row order.
const COL = {
  n: 1,
  mean: 2,
  sd: 3,
  rmse: 4,
  skewness: 5,
  kurtosis: 6,
  normality_p: 7,
  pct_within_1_96: 8,
  n_outliers: 9,
  corr_time: 10,
  corr_predicted: 11,
  r_squared: 12,
  ccc: 13,
} as const;

function statsTable() {
  return screen
    .getByRole("columnheader", { name: "Variable" })
    .closest("table")!;
}

function cell(variableName: string, column: keyof typeof COL) {
  const row = within(statsTable())
    .getByRole("cell", { name: variableName })
    .closest("tr")!;
  return within(row).getAllByRole("cell")[COL[column]];
}

function bg(el: HTMLElement) {
  return getComputedStyle(el).backgroundColor;
}

export const ClassifiesEachStatistic: Story = {
  play: async () => {
    await screen.findByRole("columnheader", { name: "Variable" });

    // CL: a clean fit — every statistic sits in the green band.
    expect(bg(cell("CL", "mean"))).toBe(GREEN);
    expect(bg(cell("CL", "sd"))).toBe(GREEN);
    expect(bg(cell("CL", "normality_p"))).toBe(GREEN);
    expect(bg(cell("CL", "r_squared"))).toBe(GREEN);

    // V: mixed classifications.
    expect(bg(cell("V", "mean"))).toBe(AMBER); // 0.2 -> amber
    expect(bg(cell("V", "sd"))).toBe(AMBER); // 0.6 -> amber
    expect(bg(cell("V", "rmse"))).toBe(RED); // 1.8 -> red
    expect(bg(cell("V", "corr_predicted"))).toBe(RED); // 0.5 -> red

    // A null metric renders as an em dash on a grey background.
    const skew = cell("V", "skewness");
    expect(skew.textContent).toBe("—");
    expect(bg(skew)).toBe(GREY);
  },
};

export const SuppressesColourForSmallSamples: Story = {
  play: async () => {
    await screen.findByRole("columnheader", { name: "Variable" });

    // KA has only 5 points: its n cell is amber to flag the small sample...
    expect(bg(cell("KA", "n"))).toBe(AMBER);

    // ...and every other statistic is left uncoloured, even values that would
    // otherwise classify as red, because they are not reliable at this n.
    expect(bg(cell("KA", "mean"))).toBe(UNCOLOURED);
    expect(bg(cell("KA", "rmse"))).toBe(UNCOLOURED);
    expect(bg(cell("KA", "corr_time"))).toBe(UNCOLOURED);
    expect(bg(cell("KA", "r_squared"))).toBe(UNCOLOURED);

    // A reliable output still colours its n cell normally (uncoloured, not amber).
    expect(bg(cell("CL", "n"))).toBe(UNCOLOURED);
  },
};
