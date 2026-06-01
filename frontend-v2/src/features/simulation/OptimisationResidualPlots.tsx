import { FC } from "react";
import createPlotlyComponent from "react-plotly.js/factory";
import Plotly from "plotly.js-basic-dist-min";
import { Data } from "plotly.js";
import { Box } from "@mui/material";
import { SimulateResponse, SubjectGroupRead, VariableRead } from "../../app/backendApi";
import { plotColours } from "./utils";

const Plot = createPlotlyComponent(Plotly);

interface ResidualPoint {
  predicted: number;
  residual: number;
  time: number;
  varId: number;
  groupId: number | null;
}

interface OptimisationResidualPlotsProps {
  predictions: SimulateResponse[];
  residuals: SimulateResponse[];
  variables: VariableRead[];
  groups: SubjectGroupRead[] | undefined;
}

/**
 * Lightweight approximation of the normal inverse CDF (probit function).
 * Uses the Abramowitz & Stegun rational approximation (AS 241 / Wichura 1988).
 * Accurate to ~1e-9 for p in (0, 1).
 */
function normalQuantile(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416,
  ];
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q: number;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  } else if (p <= pHigh) {
    q = p - 0.5;
    const r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
}

/**
 * Two diagnostic Plotly charts:
 *  1. Residuals vs Predicted values
 *  2. Normal QQ plot of residuals
 *
 * Points are coloured by (group × output variable).
 */
const OptimisationResidualPlots: FC<OptimisationResidualPlotsProps> = ({
  predictions,
  residuals,
  variables,
  groups,
}) => {
  // Build matched (predicted, residual) pairs per (group × variable).
  // residuals[i] has the same group as predictions[i].
  // residuals[i].time lists the observed time-points; predictions[i].time is the
  // full grid — we look up predicted values at each residual time-point.
  const seriesMap = new Map<string, ResidualPoint[]>();

  residuals.forEach((resGroup, gi) => {
    const predGroup = predictions[gi];
    if (!predGroup) return;

    // Build a time→index lookup for the prediction time grid.
    const predTimeIndex = new Map<number, number>();
    predGroup.time.forEach((t, idx) => predTimeIndex.set(t, idx));

    const groupId = resGroup.group ?? null;
    const group = groups?.find((g) => g.id === groupId);
    const groupLabel = group?.name ?? (gi === 0 ? "Sim-Group 1" : `Group ${gi + 1}`);

    Object.keys(resGroup.outputs).forEach((varIdStr) => {
      const varId = Number(varIdStr);
      const variable = variables.find((v) => v.id === varId);
      const label = `${variable?.name ?? varIdStr} ${groupLabel}`;

      const residualValues = resGroup.outputs[varIdStr];
      const predValues = predGroup.outputs[varIdStr];
      if (!residualValues || !predValues) return;

      // residuals response has same length as number of observed time-points for
      // that output variable. The time array in the residuals response is the
      // union of all observed times (sorted). We match by index within the
      // variable's residual array — which aligns with the residual time array.
      const points: ResidualPoint[] = [];
      resGroup.time.forEach((t, tidx) => {
        const r = residualValues[tidx];
        if (r === undefined || r === null || isNaN(r)) return;
        const predIdx = predTimeIndex.get(t);
        if (predIdx === undefined) return;
        const p = predValues[predIdx];
        if (p === undefined || p === null || isNaN(p)) return;
        points.push({ predicted: p, residual: r, time: t, varId, groupId });
      });

      if (points.length) {
        if (!seriesMap.has(label)) seriesMap.set(label, []);
        seriesMap.get(label)!.push(...points);
      }
    });
  });

  // Assign colours deterministically by series index
  const seriesEntries = Array.from(seriesMap.entries());

  // --- Residuals vs Time traces ---
  const residVsTimeTraces: Partial<Data>[] = seriesEntries.map(([label, points], i) => ({
    type: "scatter",
    mode: "markers",
    name: label,
    x: points.map((p) => p.time),
    y: points.map((p) => p.residual),
    marker: { color: plotColours[i % plotColours.length], size: 6 },
  }));

  const allTimes = seriesEntries.flatMap(([, pts]) => pts.map((p) => p.time));
  if (allTimes.length > 0) {
    const minT = Math.min(...allTimes);
    const maxT = Math.max(...allTimes);
    residVsTimeTraces.push({
      type: "scatter",
      mode: "lines",
      name: "y = 0",
      x: [minT, maxT],
      y: [0, 0],
      line: { color: "#888", dash: "dash", width: 1 },
      showlegend: false,
    } as Partial<Data>);
  }

  // --- Residuals vs Predictions traces ---
  const residVsPredTraces: Partial<Data>[] = seriesEntries.map(([label, points], i) => ({
    type: "scatter",
    mode: "markers",
    name: label,
    x: points.map((p) => p.predicted),
    y: points.map((p) => p.residual),
    marker: { color: plotColours[i % plotColours.length], size: 6 },
  }));

  // Zero reference line spanning data range
  const allPredicted = seriesEntries.flatMap(([, pts]) => pts.map((p) => p.predicted));
  if (allPredicted.length > 0) {
    const minX = Math.min(...allPredicted);
    const maxX = Math.max(...allPredicted);
    residVsPredTraces.push({
      type: "scatter",
      mode: "lines",
      name: "y = 0",
      x: [minX, maxX],
      y: [0, 0],
      line: { color: "#888", dash: "dash", width: 1 },
      showlegend: false,
    } as Partial<Data>);
  }

  // --- QQ plot traces ---
  // Collect all residuals per series, compute theoretical quantiles.
  const qqTraces: Partial<Data>[] = seriesEntries.map(([label, points], i) => {
    const sorted = points.map((p) => p.residual).sort((a, b) => a - b);
    const n = sorted.length;
    const theoretical = sorted.map((_, k) => normalQuantile((k + 0.5) / n));
    return {
      type: "scatter",
      mode: "markers",
      name: label,
      x: theoretical,
      y: sorted,
      marker: { color: plotColours[i % plotColours.length], size: 6 },
    };
  });

  // Reference diagonal line y = x
  const allTheoretical = seriesEntries.flatMap(([, pts]) => {
    const sorted = pts.map((p) => p.residual).sort((a, b) => a - b);
    return sorted.map((_, k) => normalQuantile((k + 0.5) / sorted.length));
  });
  if (allTheoretical.length > 0) {
    const minT = Math.min(...allTheoretical);
    const maxT = Math.max(...allTheoretical);
    qqTraces.push({
      type: "scatter",
      mode: "lines",
      name: "y = x",
      x: [minT, maxT],
      y: [minT, maxT],
      line: { color: "#888", dash: "dash", width: 1 },
      showlegend: false,
    } as Partial<Data>);
  }

  const commonLayout = {
    autosize: true,
    margin: { l: 60, r: 40, t: 50, b: 60 },
    showlegend: true,
    legend: { orientation: "v" as const, yanchor: "top" as const, xanchor: "right" as const, y: 1, x: 1 },
  };

  return (
    <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
      <Box sx={{ flex: 1, minWidth: 300 }}>
        <Plot
          data={residVsTimeTraces}
          layout={{
            ...commonLayout,
            title: { text: "Residuals vs Time" },
            xaxis: { title: { text: "Time" } },
            yaxis: { title: { text: "Residual" }, exponentformat: "power" },
          }}
          style={{ width: "100%", height: 380 }}
          useResizeHandler
        />
      </Box>
      <Box sx={{ flex: 1, minWidth: 300 }}>
        <Plot
          data={residVsPredTraces}
          layout={{
            ...commonLayout,
            title: { text: "Residuals vs Predicted" },
            xaxis: { title: { text: "Predicted" }, exponentformat: "power" },
            yaxis: { title: { text: "Residual" }, exponentformat: "power" },
          }}
          style={{ width: "100%", height: 380 }}
          useResizeHandler
        />
      </Box>
      <Box sx={{ flex: 1, minWidth: 300 }}>
        <Plot
          data={qqTraces}
          layout={{
            ...commonLayout,
            title: { text: "Normal QQ Plot of Residuals" },
            xaxis: { title: { text: "Theoretical quantiles" } },
            yaxis: { title: { text: "Sample quantiles" } },
          }}
          style={{ width: "100%", height: 380 }}
          useResizeHandler
        />
      </Box>
    </Box>
  );
};

export default OptimisationResidualPlots;
