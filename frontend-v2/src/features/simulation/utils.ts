import { FieldArrayWithId } from "react-hook-form";
import {
  CombinedModelRead,
  CompoundRead,
  SimulateResponse,
  Simulation,
  SimulationYAxis,
  SubjectGroupRead,
  UnitRead,
  VariableRead,
} from "../../app/backendApi";
import { Layout, ScatterData, Shape } from "plotly.js";
import { SubjectBiomarker } from "../../hooks/useDataset";

export type ScatterDataWithVariable = ScatterData & { variable: string };

// https://github.com/plotly/plotly.js/blob/8c47c16daaa2020468baf9376130e085a4f01ec6/src/components/color/attributes.js#L4-L16
export const plotColours = [
  "#1f77b4", // muted blue
  "#ff7f0e", // safety orange
  "#2ca02c", // cooked asparagus green
  "#d62728", // brick red
  "#9467bd", // muted purple
  "#8c564b", // chestnut brown
  "#e377c2", // raspberry yogurt pink
  "#7f7f7f", // middle gray
  "#bcbd22", // curry yellow-green
  "#17becf", // blue-teal
];

export function getYAxisUnit(
  compound: CompoundRead,
  variable: VariableRead,
  units: UnitRead[],
): number | null | undefined {
  if (!variable.name.startsWith("C")) {
    return variable.unit;
  }
  let concentrationUnitSymbol: string | undefined;
  if (variable.name === "CT") {
    concentrationUnitSymbol = "pg/mL";
  } else if (compound.compound_type === "SM") {
    concentrationUnitSymbol = "ng/mL";
  } else if (compound.compound_type === "LM") {
    concentrationUnitSymbol = "mg/mL";
  }
  if (!concentrationUnitSymbol) {
    return variable.unit;
  }
  const concentrationUnit = units.find(
    (unit) => unit.symbol === concentrationUnitSymbol,
  );
  const defaultUnit = concentrationUnit ? concentrationUnit.id : variable.unit;
  return defaultUnit;
}

export function ranges(
  minY: number | undefined,
  maxY: number | undefined,
  minY2: number | undefined,
  maxY2: number | undefined,
  plot: FieldArrayWithId<Simulation, "plots", "id">,
): { rangey: number[] | undefined; rangey2: number[] | undefined } {
  // setup range for y-axis
  let rangey: number[] | undefined = undefined;
  let rangey2: number[] | undefined = undefined;

  if (minY !== undefined && maxY !== undefined) {
    if (
      plot.y_scale === "lg2" ||
      plot.y_scale === "lg10" ||
      plot.y_scale === "ln"
    ) {
      rangey = [Math.log10(minY), Math.log10(2 * maxY)];
      if (plot.max) {
        rangey[1] = Math.log10(plot.max);
      }
      if (plot.min) {
        rangey[0] = Math.log10(plot.min);
      } else if (plot.max) {
        rangey[0] = Math.log10(Math.max(minY, plot.max * 1e-3));
      } else {
        rangey[0] = Math.log10(Math.max(minY, maxY * 1e-3));
      }
    } else {
      // linear scale
      if (plot.max || plot.min) {
        const deltaY = (plot.max || maxY) - (plot.min || minY);
        rangey = [minY - 0.1 * deltaY, maxY + 0.1 * deltaY];
        if (plot.max) {
          rangey[1] = plot.max;
        }
        if (plot.min) {
          rangey[0] = plot.min;
        }
      }
    }
  }
  if (minY2 !== undefined && maxY2 !== undefined) {
    if (
      plot.y2_scale === "lg2" ||
      plot.y2_scale === "lg10" ||
      plot.y2_scale === "ln"
    ) {
      rangey2 = [Math.log10(minY2), Math.log10(maxY2)];
      if (plot.max2) {
        rangey2[1] = Math.log10(plot.max2);
      }
      if (plot.min2) {
        rangey2[0] = Math.log10(plot.min2);
      } else if (plot.max2) {
        rangey2[0] = Math.log10(Math.max(minY2, plot.max2 * 1e-3));
      } else {
        rangey2[0] = Math.log10(Math.max(minY2, maxY2 * 1e-3));
      }
    }
  }
  return { rangey, rangey2 };
}

export function genIcLines(
  units: UnitRead[],
  plot: FieldArrayWithId<Simulation, "plots", "id">,
  compound: CompoundRead,
  concentrationUnit: UnitRead,
) {
  let icLines: number[] = [];

  const concentrationUnitIds = concentrationUnit.compatible_units.map((unit) =>
    parseInt(unit.id),
  );
  const yAxisIsConcentration = plot.y_unit
    ? concentrationUnitIds.includes(plot.y_unit)
    : false;

  const exp = compound.efficacy_experiments.find(
    (exp) => exp.id === compound.use_efficacy,
  );
  if (yAxisIsConcentration && exp) {
    if (exp.hill_coefficient && exp.c50) {
      const yAxisUnit = units.find((unit) => unit.id === plot.y_unit);
      const c50Unit = units.find((unit) => unit.id === exp.c50_unit);
      const compatibleUnit = c50Unit?.compatible_units.find(
        (u) => parseInt(u.id) === yAxisUnit?.id,
      );
      const factor = compatibleUnit
        ? parseFloat(compatibleUnit.conversion_factor)
        : 1.0;
      icLines = plot.cx_lines.map((cx_line) => {
        const hc = exp.hill_coefficient || 1.0;
        const ec50 = exp.c50 || 0.0;
        const cx = cx_line.value / (100.0 - cx_line.value);
        const iCx = cx ** (1.0 / hc) * ec50;
        return iCx * factor;
      });
    }
  }
  return icLines;
}

export function generatePlotData(
  d: SimulateResponse,
  visibleGroups: string[],
  colour: string,
  dash: string,
  index: number,
  group: SubjectGroupRead | undefined,
  y_axis: SimulationYAxis,
  plot: FieldArrayWithId<Simulation, "plots", "id">,
  units: UnitRead[],
  model: CombinedModelRead,
  variables: VariableRead[],
  xConversionFactor: number,
  isReference?: boolean,
) {
  const visible =
    index === 0
      ? visibleGroups.includes("Sim-Group 1")
      : visibleGroups.includes(group?.name || "");
  const variableValues = d.outputs[y_axis.variable];
  const variable = variables.find((v) => v.id === y_axis.variable);
  const variableName = variable?.name;
  const variableUnit = units.find((u) => u.id === variable?.unit);

  const yaxisUnit = y_axis.right
    ? units.find((u) => u.id === plot.y_unit2)
    : units.find((u) => u.id === plot.y_unit);
  const yCompatibleUnit = variableUnit?.compatible_units.find(
    (u) => parseInt(u.id) === yaxisUnit?.id,
  );

  const starts_with_A = model.is_library_model
    ? variableName?.startsWith("A")
    : false;
  const starts_with_C_or_A = model.is_library_model
    ? variableName?.startsWith("C") || starts_with_A
    : false;
  const has_target_1 = starts_with_C_or_A && variableName?.includes("T1");
  const has_target_2 = starts_with_C_or_A && variableName?.includes("T2");
  const has_drug = starts_with_C_or_A && variableName?.includes("D");

  // if we've got a concentration or amount variable that includes T1 or T2, use the target conversion factors
  // unless D is also present (then it's a drug concentration/amount).
  const is_target = starts_with_C_or_A && has_target_1 && !has_drug;
  const is_target2 = starts_with_C_or_A && has_target_2 && !has_drug;

  const yConversionFactor = yCompatibleUnit
    ? parseFloat(
        is_target
          ? yCompatibleUnit.target_conversion_factor
          : is_target2
            ? yCompatibleUnit.target2_conversion_factor
            : yCompatibleUnit.conversion_factor,
      )
    : 1.0;

  const name = variableValues
    ? `${isReference ? "REF" : ""} ${variableName} ${group?.name || "Sim-Group 1"}`
    : `${isReference ? "REF" : ""} ${y_axis.variable} ${group?.name || "Sim-Group 1"}`;
  const x = variableValues ? d.time.map((t) => t * xConversionFactor) : [];
  const y = variableValues
    ? variableValues.map((v) => v * yConversionFactor)
    : [];
  const yaxis = y_axis.right ? "y2" : undefined;
  const basePlot = {
    yaxis,
    x,
    y,
    name: name.trim(),
    variable: variableValues ? variableName : y_axis.variable,
    visible: visible ? true : "legendonly",
  };
  return variableValues
    ? { ...basePlot, line: { color: colour, dash: dash } }
    : { ...basePlot, type: "scatter" };
}

export function minMaxAxisLimits(
  data: number[],
  minY: number | undefined,
  maxY: number | undefined,
  minY2: number | undefined,
  maxY2: number | undefined,
  has_right_axis: boolean | undefined,
) {
  if (has_right_axis) {
    if (minY2 === undefined) {
      minY2 = Math.min(...data);
    } else {
      minY2 = Math.min(minY2, ...data);
    }
    if (maxY2 === undefined) {
      maxY2 = Math.max(...data);
    } else {
      maxY2 = Math.max(maxY2, ...data);
    }
  } else {
    if (minY === undefined) {
      minY = Math.min(...data);
    } else {
      minY = Math.min(minY, ...data);
    }
    if (maxY === undefined) {
      maxY = Math.max(...data);
    } else {
      maxY = Math.max(maxY, ...data);
    }
  }
  return { minY, maxY, minY2, maxY2 };
}

type PlotProps = {
  colourOffset: number;
  groups: SubjectGroupRead[] | undefined;
  isReference?: boolean;
  model: CombinedModelRead;
  plot: FieldArrayWithId<Simulation, "plots", "id">;
  units: UnitRead[];
  variables: VariableRead[];
  visibleGroups: string[];
  xConversionFactor: number;
  y_axis: SimulationYAxis;
};
const createPlot =
  ({
    colourOffset,
    groups,
    isReference = false,
    model,
    plot,
    units,
    variables,
    visibleGroups,
    xConversionFactor,
    y_axis,
  }: PlotProps) =>
  (data: SimulateResponse, index: number) => {
    const colourIndex = index + colourOffset;
    const colour = plotColours[colourIndex % plotColours.length];
    const group = groups?.[index - 1];
    const style = isReference ? "dot" : "solid";
    return generatePlotData(
      data,
      visibleGroups,
      colour,
      style,
      index,
      group,
      y_axis,
      plot,
      units,
      model,
      variables,
      xConversionFactor,
      isReference,
    );
  };

type PlotsProps = {
  data: SimulateResponse[];
  dataReference: SimulateResponse[];
  groups: SubjectGroupRead[] | undefined;
  model: CombinedModelRead;
  plot: FieldArrayWithId<Simulation, "plots", "id">;
  units: UnitRead[];
  variables: VariableRead[];
  visibleGroups: string[];
  xConversionFactor: number;
};

export const createPlots = ({
  data,
  dataReference,
  groups,
  model,
  plot,
  units,
  variables,
  visibleGroups,
  xConversionFactor,
}: PlotsProps) => {
  return plot.y_axes.map((y_axis, i) => {
    const colourOffset = data.length * i;
    return data
      .map(
        createPlot({
          colourOffset,
          groups,
          model,
          plot,
          units,
          variables,
          visibleGroups,
          xConversionFactor,
          y_axis,
        }),
      )
      .concat(
        dataReference.map(
          createPlot({
            colourOffset,
            groups,
            isReference: true,
            model,
            plot,
            units,
            variables,
            visibleGroups,
            xConversionFactor,
            y_axis,
          }),
        ),
      );
  });
};

export const getYRanges = ({
  plotData,
}: {
  plotData: Partial<ScatterDataWithVariable>[];
}) => {
  let minY: number | undefined = undefined;
  let minY2: number | undefined = undefined;
  let maxY: number | undefined = undefined;
  let maxY2: number | undefined = undefined;
  plotData.forEach((d) => {
    const isRightAxis = d.yaxis === "y2";
    const data = d.y as number[];
    ({ minY, maxY, minY2, maxY2 } = minMaxAxisLimits(
      data,
      minY,
      maxY,
      minY2,
      maxY2,
      isRightAxis,
    ));
  });
  return { minY, maxY, minY2, maxY2 };
};

export const getDefaultAxisTitles = ({
  plot,
  units,
  yAxisVariableNames,
  y2AxisVariableNames,
}: {
  plot: FieldArrayWithId<Simulation, "plots", "id">;
  units: UnitRead[];
  yAxisVariableNames: (string | undefined)[];
  y2AxisVariableNames: (string | undefined)[];
}) => {
  let yAxisTitle = [...new Set(yAxisVariableNames)].join(", ");
  let y2AxisTitle = [...new Set(y2AxisVariableNames)].join(", ");
  let xAxisTitle = "Time";
  const yUnit = units.find((u) => u.id === plot.y_unit);
  const y2Unit = units.find((u) => u.id === plot.y_unit2);
  const xUnit = units.find((u) => u.id === plot.x_unit);
  if (yUnit) {
    yAxisTitle = `${yAxisTitle}  [${yUnit.symbol}]`;
  }
  if (y2Unit) {
    y2AxisTitle = `${y2AxisTitle}  [${y2Unit.symbol}]`;
  }
  if (xUnit) {
    xAxisTitle = `${xAxisTitle}  [${xUnit.symbol}]`;
  }

  return { yAxisTitle, y2AxisTitle, xAxisTitle };
};

export const getPlotDimensions = ({
  dimensions,
  isHorizontal,
  isVertical,
  plotCount,
}: {
  dimensions: { height: number; width: number };
  isHorizontal: boolean;
  isVertical: boolean;
  plotCount: number;
}) => {
  const buffer = 10;
  const columnCount = Math.min(plotCount, screen.width > 2500 ? 3 : 2);
  const layoutBreakpoint = 900;

  if (isVertical && !isHorizontal) {
    return dimensions.width > layoutBreakpoint
      ? {
          height: dimensions.height / 2 - buffer,
          width: dimensions.width - buffer,
        }
      : {
          height: dimensions.height / 1.5 - buffer,
          width: dimensions.width - buffer,
        };
  }

  if (!isVertical && isHorizontal) {
    return dimensions.width > layoutBreakpoint
      ? {
          height: dimensions.height - buffer,
          width: dimensions.width / columnCount - buffer,
        }
      : {
          height: dimensions.height - buffer,
          width: dimensions.width / 1.5 - buffer,
        };
  }

  return {
    height: dimensions.height / 2 - buffer,
    width: dimensions.width / columnCount - buffer,
  };
};

function getBaseShape(icLine: number): Partial<Shape> {
  return {
    type: "line",
    y0: icLine,
    y1: icLine,
    yref: "y",
    ysizemode: "scaled",
    line: {
      color: "rgb(255, 0, 0)",
      width: 1,
      dash: "dot",
    },
  };
}

export const getICLineShapes = ({
  icLines,
  minX,
  maxX,
  plot,
}: {
  icLines: number[];
  minX: number;
  maxX: number;
  plot: FieldArrayWithId<Simulation, "plots", "id">;
}) => {
  // calculate shapes from icLines, if present.
  const baseShapes = icLines.map(getBaseShape);
  const shapes: Partial<Shape>[] = baseShapes.map((baseShape, i) => {
    const x0 = minX;
    const x1 = maxX;
    const labelText = `Cx = ${plot.cx_lines[i].value}%`;
    return {
      ...baseShape,
      x0,
      x1,
      label: {
        text: labelText,
        font: {
          color: "rgb(0, 0, 0)",
        },
        yanchor: "top",
        xanchor: "center",
        textposition: "middle",
      },
    };
  });
  return shapes;
};

type PlotAxesProps = {
  plot: FieldArrayWithId<Simulation, "plots", "id">;
  xAxisTitle: string;
  yAxisTitle: string;
  y2AxisTitle: string;
  yRanges: {
    minY: number | undefined;
    maxY: number | undefined;
    minY2: number | undefined;
    maxY2: number | undefined;
  };
};
export const getPlotAxes = ({
  plot,
  xAxisTitle,
  yAxisTitle,
  y2AxisTitle,
  yRanges: { minY, maxY, minY2, maxY2 },
}: PlotAxesProps) => {
  const axisScaleOptions: {
    [key: string]: { type: "linear" | "log"; dtick?: number | string };
  } = {
    lin: { type: "linear" },
    lg2: { type: "log", dtick: Math.log10(2) },
    lg10: { type: "log" },
    ln: { type: "log", dtick: Math.log10(Math.E) },
  };
  // setup range for y-axis
  const { rangey, rangey2 } = ranges(minY, maxY, minY2, maxY2, plot);
  return {
    xaxis: {
      title: {
        text: xAxisTitle,
      },
      automargin: true,
      exponentformat: "power",
      ...axisScaleOptions[plot.x_scale || "lin"],
    },
    yaxis: {
      title: {
        text: yAxisTitle,
      },
      automargin: true,
      range: rangey,
      exponentformat: "power",
      ...axisScaleOptions[plot.y_scale || "lin"],
    },
    yaxis2: {
      title: {
        text: y2AxisTitle,
      },
      anchor: "free",
      range: rangey2,
      overlaying: "y",
      automargin: true,
      side: "right",
      position: 1.0,
      exponentformat: "power",
      ...axisScaleOptions[plot.y2_scale || "lin"],
    },
  } as Partial<Layout>;
};

type PlotLayoutProps = {
  plotDimensions: { height: number; width: number };
  shouldShowLegend: boolean;
};
export const getPlotLayout: (props: PlotLayoutProps) => Partial<Layout> = ({
  plotDimensions,
  shouldShowLegend,
}) => {
  return {
    autosize: false,
    width: plotDimensions?.width,
    height: plotDimensions?.height,
    dragmode: "pan",
    showlegend: shouldShowLegend,
    legend: {
      orientation: "v",
      yanchor: "top",
      xanchor: "right",
      y: 1,
      x: 1,
    },
    margin: {
      l: 50,
      r: 50,
      b: 50,
      t: 50,
      pad: 4,
    },
  };
};

type ScatterPlotProps = {
  biomarkerData: SubjectBiomarker[] | undefined;
  colourOffset: number;
  group: SubjectGroupRead;
  index: number;
  timeConversionFactor: number;
  visibleGroups: string[];
  y_axis: SimulationYAxis;
  yConversionFactor: number;
};

type ScatterPlotData = {
  name: string;
  x: number[] | undefined;
  y: number[] | undefined;
  yaxis: string | undefined;
  type: string;
  mode: string;
  visible: boolean | "legendonly";
  marker: { color: string };
};

const generateScatterPlot: (props: ScatterPlotProps) => ScatterPlotData = ({
  biomarkerData,
  colourOffset,
  group,
  index,
  timeConversionFactor,
  visibleGroups,
  y_axis,
  yConversionFactor,
}) => {
  const visible = visibleGroups.includes(group.name);
  const groupBiomarkers = biomarkerData?.filter((d) =>
    group.subjects.includes(d.subjectId),
  );
  const colourIndex = index + colourOffset + 1;

  return {
    name: group.name,
    x: groupBiomarkers?.map((d) => d?.time * timeConversionFactor),
    y: groupBiomarkers?.map((d) => d?.value * yConversionFactor),
    yaxis: y_axis.right ? "y2" : undefined,
    type: "scatter",
    mode: "markers",
    visible: visible ? true : "legendonly",
    marker: {
      color: plotColours[colourIndex % plotColours.length],
    },
  };
};

type ScatterPlotsProps = {
  biomarkerVariables: (number | undefined)[];
  data: SimulateResponse[];
  groups: SubjectGroupRead[] | undefined;
  i: number;
  model: CombinedModelRead;
  plot: FieldArrayWithId<Simulation, "plots", "id">;
  subjectBiomarkers: SubjectBiomarker[][] | undefined;
  units: UnitRead[];
  visibleGroups: string[];
  y_axis: SimulationYAxis;
};

export const generateScatterPlots: (
  props: ScatterPlotsProps,
) => ScatterPlotData[] | undefined = ({
  biomarkerVariables,
  data,
  groups,
  i,
  model,
  plot,
  subjectBiomarkers,
  units,
  visibleGroups,
  y_axis,
}) => {
  const xAxisUnit = units.find((u) => u.id === plot.x_unit);
  const yAxisUnit = y_axis.right
    ? units.find((u) => u.id === plot.y_unit2)
    : units.find((u) => u.id === plot.y_unit);

  const colourOffset = data.length * i;
  const biomarkerIndex = biomarkerVariables.indexOf(y_axis.variable);
  const biomarkerData = subjectBiomarkers?.[biomarkerIndex];
  const { qname, unit, timeUnit } = biomarkerData?.[0] || {};
  const yCompatibleUnit = unit?.compatible_units.find(
    (u) => parseInt(u.id) === yAxisUnit?.id,
  );
  const timeCompatibleUnit = timeUnit?.compatible_units.find(
    (u) => parseInt(u.id) === xAxisUnit?.id,
  );
  const timeConversionFactor = timeCompatibleUnit
    ? parseFloat(timeCompatibleUnit.conversion_factor)
    : 1.0;
  const is_target = model.is_library_model
    ? qname?.includes("CT1") || qname?.includes("AT1")
    : false;
  const yConversionFactor = yCompatibleUnit
    ? parseFloat(
        is_target
          ? yCompatibleUnit.target_conversion_factor
          : yCompatibleUnit.conversion_factor,
      )
    : 1.0;
  return groups?.map((group, index) =>
    generateScatterPlot({
      biomarkerData,
      colourOffset,
      group,
      index,
      timeConversionFactor,
      visibleGroups,
      y_axis,
      yConversionFactor,
    }),
  );
};
