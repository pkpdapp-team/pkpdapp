import { FC } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
} from "@mui/material";
import { VariableRead } from "../../app/backendApi";

/** One output variable's residual summary statistics (see the backend
 * `_residual_summary_statistics` helper). All metric fields may be null when
 * they could not be computed. */
export interface ResidualStat {
  variable: number;
  n: number;
  reliable: boolean;
  mean: number | null;
  sd: number | null;
  rmse: number | null;
  skewness: number | null;
  kurtosis: number | null;
  normality_p: number | null;
  pct_within_1_96: number | null;
  n_outliers: number | null;
  corr_time: number | null;
  corr_predicted: number | null;
  r_squared: number | null;
  ccc: number | null;
}

interface OptimisationResidualStatsTableProps {
  summaryStatistics: { [key: string]: unknown }[] | null;
  variables: VariableRead[];
}

// Traffic-light background colours, matching OptimisationCovarianceTable.
const GREEN = "#c8e6c9";
const AMBER = "#fff9c4";
const RED = "#ffcdd2";
const GREY = "#f5f5f5";

type MetricKey = Exclude<keyof ResidualStat, "variable" | "n" | "reliable">;

function formatNum(x: number): string {
  const abs = Math.abs(x);
  if (abs === 0) return "0";
  const e = Math.floor(Math.log10(abs));
  return e > 4 || e < -4
    ? x.toExponential(2)
    : String(parseFloat(x.toPrecision(4)));
}

// Three-way classifiers: green / amber / red by distance from the expected value
// of a standardised residual (which is distributed N(0, 1) under a good fit).
function band(green: boolean, amber: boolean): string {
  return green ? GREEN : amber ? AMBER : RED;
}

function metricColour(key: MetricKey, s: ResidualStat): string | undefined {
  const v = s[key];
  if (v === null || v === undefined || !isFinite(v as number)) return GREY;
  const x = v as number;
  const a = Math.abs(x);
  switch (key) {
    case "mean":
      return band(a < 0.1, a < 0.3);
    case "sd":
      return band(a >= 0.8 && a <= 1.2, a >= 0.5 && a <= 1.5);
    case "rmse":
      return band(Math.abs(x - 1) < 0.2, Math.abs(x - 1) < 0.5);
    case "skewness":
      return band(a < 0.5, a < 1);
    case "kurtosis":
      return band(a < 1, a < 2);
    case "normality_p":
      return band(x > 0.05, x > 0.01);
    case "pct_within_1_96":
      return band(x >= 93, x >= 90);
    case "n_outliers": {
      const frac = s.n > 0 ? x / s.n : 0;
      return band(x === 0, frac <= 0.01);
    }
    case "corr_time":
    case "corr_predicted":
      return band(a < 0.2, a < 0.4);
    case "r_squared":
    case "ccc":
      return band(x > 0.9, x > 0.75);
    default:
      return GREY;
  }
}

/** Background colour for a cell. When the sample is too small to be reliable, only
 * the "n" cell is coloured (amber) and all metric cells are left uncoloured, since
 * the statistics are not informative at that sample size. */
function cellColour(
  key: "n" | MetricKey,
  s: ResidualStat,
): string | undefined {
  if (key === "n") return s.reliable ? undefined : AMBER;
  if (!s.reliable) return undefined;
  return metricColour(key, s);
}

function formatValue(key: "n" | MetricKey, s: ResidualStat): string {
  if (key === "n") return String(s.n);
  const v = s[key];
  if (v === null || v === undefined || !isFinite(v as number)) return "—";
  const x = v as number;
  if (key === "n_outliers") return String(x);
  if (key === "pct_within_1_96") return `${formatNum(x)}%`;
  return formatNum(x);
}

// Row descriptors: the statistic, its label, expected value and a short tooltip.
const ROWS: {
  key: "n" | MetricKey;
  label: string;
  expected: string;
  tooltip: string;
}[] = [
  { key: "n", label: "n", expected: "", tooltip: "Number of residual points." },
  {
    key: "mean",
    label: "Mean",
    expected: "→ 0",
    tooltip: "Mean of the standardised residuals. Non-zero indicates bias.",
  },
  {
    key: "sd",
    label: "SD",
    expected: "→ 1",
    tooltip:
      "Standard deviation of the standardised residuals. Deviation from 1 means the noise level is mis-estimated.",
  },
  {
    key: "rmse",
    label: "RMSE",
    expected: "→ 1",
    tooltip: "Root mean square of the standardised residuals (bias + scale).",
  },
  {
    key: "skewness",
    label: "Skewness",
    expected: "→ 0",
    tooltip: "Asymmetry of the residual distribution.",
  },
  {
    key: "kurtosis",
    label: "Excess kurtosis",
    expected: "→ 0",
    tooltip: "Tail weight relative to a normal distribution.",
  },
  {
    key: "normality_p",
    label: "Normality p",
    expected: "large",
    tooltip:
      "Shapiro–Wilk (n ≤ 5000) or KS p-value testing normality. Small p rejects normality.",
  },
  {
    key: "pct_within_1_96",
    label: "% within ±1.96",
    expected: "≈ 95%",
    tooltip: "Fraction of standardised residuals inside the central 95% band.",
  },
  {
    key: "n_outliers",
    label: "Outliers |z|>3",
    expected: "→ 0",
    tooltip: "Count of standardised residuals beyond ±3.",
  },
  {
    key: "corr_time",
    label: "Corr vs time",
    expected: "→ 0",
    tooltip:
      "Correlation of residuals with time. Non-zero suggests a temporal trend / misspecification.",
  },
  {
    key: "corr_predicted",
    label: "Corr vs predicted",
    expected: "→ 0",
    tooltip:
      "Correlation of residuals with the prediction. Non-zero suggests remaining structure / heteroscedasticity.",
  },
  {
    key: "r_squared",
    label: "R²",
    expected: "→ 1",
    tooltip: "Coefficient of determination for observed vs predicted.",
  },
  {
    key: "ccc",
    label: "CCC",
    expected: "→ 1",
    tooltip:
      "Concordance correlation coefficient for observed vs predicted (accuracy + precision about y = x).",
  },
];

/**
 * Dense MUI table of per-output residual summary statistics (one column per fitted
 * output variable, one row per statistic). Cells are coloured green / amber / red
 * against the value expected for a standardised residual (N(0, 1)). When an output
 * has too few points to be reliable, only its "n" cell is coloured (amber) and the
 * remaining cells are left uncoloured.
 */
const OptimisationResidualStatsTable: FC<
  OptimisationResidualStatsTableProps
> = ({ summaryStatistics, variables }) => {
  if (!summaryStatistics || summaryStatistics.length === 0) return null;
  const stats = summaryStatistics as unknown as ResidualStat[];

  const variableName = (id: number) => {
    const v = variables.find((v) => v.id === id);
    return v?.name ?? v?.qname ?? String(id);
  };

  return (
    <Table size="small" sx={{ width: "auto" }}>
      <TableHead>
        <TableRow>
          <TableCell sx={{ fontWeight: "bold" }}>Variable</TableCell>
          {ROWS.map((row) => (
            <TableCell key={row.key} align="right" sx={{ fontWeight: "bold" }}>
              <Tooltip
                title={
                  row.expected ? `${row.tooltip} (expected ${row.expected})` : row.tooltip
                }
              >
                <span>{row.label}</span>
              </Tooltip>
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {stats.map((s) => (
          <TableRow key={s.variable}>
            <TableCell sx={{ fontWeight: "bold" }}>
              {variableName(s.variable)}
            </TableCell>
            {ROWS.map((row) => (
              <TableCell
                key={row.key}
                align="right"
                sx={{ backgroundColor: cellColour(row.key, s) }}
              >
                {formatValue(row.key, s)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default OptimisationResidualStatsTable;
