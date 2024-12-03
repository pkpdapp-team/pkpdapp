import { FC, useState } from "react";
import createPlotlyComponent from "react-plotly.js/factory";
import {
  CombinedModelRead,
  CompoundRead,
  SimulateResponse,
  Simulation,
  SimulationYAxis,
  SubjectGroupRead,
  UnitRead,
  VariableRead,
  useProtocolListQuery,
} from "../../app/backendApi";
import {
  Config,
  Data,
  Layout,
  PlotlyHTMLElement,
  Icon as PlotlyIcon,
  ScatterData,
} from "plotly.js";
import Plotly from "plotly.js-basic-dist-min";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import { Control, FieldArrayWithId, UseFormSetValue } from "react-hook-form";
import SimulationPlotForm from "./SimulationPlotForm";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import useDataset from "../../hooks/useDataset";
import useSubjectGroups from "../../hooks/useSubjectGroups";

const Plot = createPlotlyComponent(Plotly);
// https://github.com/plotly/plotly.js/blob/8c47c16daaa2020468baf9376130e085a4f01ec6/src/components/color/attributes.js#L4-L16
const plotColours = [
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

function ranges(
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

function genIcLines(
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

function generatePlotData(
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
  xconversionFactor: number,
  isReference?: boolean
) {
  const visible =
    index === 0
      ? visibleGroups.includes("Project")
      : visibleGroups.includes(group?.name || "");
  const variableValues = d.outputs[y_axis.variable];
  const variable = variables.find((v) => v.id === y_axis.variable);
  const variableName = variable?.name;
  const variableUnit = units.find((u) => u.id === variable?.unit);

  const yaxisUnit = y_axis.right
    ? units.find((u) => u.id === plot.y_unit2)
    : units.find((u) => u.id === plot.y_unit);
  const ycompatibleUnit = variableUnit?.compatible_units.find(
    (u) => parseInt(u.id) === yaxisUnit?.id,
  );

  const is_target = model.is_library_model
    ? variableName?.includes("CT1") || variableName?.includes("AT1")
    : false;
  const yconversionFactor = ycompatibleUnit
    ? parseFloat(
        is_target
          ? ycompatibleUnit.target_conversion_factor
          : ycompatibleUnit.conversion_factor,
      )
    : 1.0;

  if (variableValues) {
    return {
      yaxis: y_axis.right ? "y2" : undefined,
      x: d.time.map((t) => t * xconversionFactor),
      y: variableValues.map((v) => v * yconversionFactor),
      name: `${isReference ? 'REF' : ''} ${variableName} ${group?.name || "project"}`,
      visible: visible ? true : "legendonly",
      line: {
        color: colour,
        dash: dash,
      },
    };
  } else {
    return {
      yaxis: y_axis.right ? "y2" : undefined,
      x: [],
      y: [],
      type: "scatter",
      name: `${isReference ? 'REF' : ''} ${y_axis.variable} ${group?.name || "project"}`,
      visible: visible ? true : "legendonly",
    };
  }
}

function minMaxAxisLimits(
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

interface SimulationPlotProps {
  index: number;
  plot: FieldArrayWithId<Simulation, "plots", "id">;
  data: SimulateResponse[];
  dataReference: SimulateResponse[];
  variables: VariableRead[];
  control: Control<Simulation>;
  setValue: UseFormSetValue<Simulation>;
  remove: (index: number) => void;
  units: UnitRead[];
  compound: CompoundRead;
  model: CombinedModelRead;
  visibleGroups: string[];
  shouldShowLegend: boolean;
  isVertical: boolean;
  isHorizontal: boolean;
  dimensions: {
    width: number;
    height: number;
  };
  plotCount: number;
}

const SimulationPlotView: FC<SimulationPlotProps> = ({
  index,
  plot,
  data,
  dataReference,
  variables,
  control,
  setValue,
  remove,
  units,
  compound,
  model,
  visibleGroups,
  shouldShowLegend,
  isVertical,
  isHorizontal,
  dimensions,
  plotCount
}) => {
  const projectId = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  useProtocolListQuery({ projectId: projectId || 0 }, { skip: !projectId });

  const { groups } = useSubjectGroups();
  const { subjectBiomarkers } = useDataset(projectId);

  const [open, setOpen] = useState(false);

  const handleCustomisePlot = () => {
    setOpen(true);
  };

  const handleRemovePlot = () => {
    if (window.confirm("Are you sure you want to delete this plot?")) {
      remove(index);
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleDelete = () => {
    remove(index);
    setOpen(false);
  };

  const handleCopyToClipboard = (gd: PlotlyHTMLElement) => {
    Plotly.toImage(gd, { format: "png", width: 1000, height: 600 }).then(
      async (url: string) => {
        try {
          const data = await fetch(url);
          const blob = await data.blob();
          await navigator.clipboard.write([
            new ClipboardItem({ [blob.type]: blob }),
          ]);
          console.log("Image copied.");
        } catch (err: any) {
          console.error(err.name, err.message);
        }
      },
    );
  };

  const timeVariable = variables.find((v) => v.binding === "time");
  const timeUnit = units.find((u) => u.id === timeVariable?.unit);
  const xaxisUnit = units.find((u) => u.id === plot.x_unit);
  const xcompatibleUnit = timeUnit?.compatible_units.find(
    (u) => parseInt(u.id) === xaxisUnit?.id,
  );
  const xconversionFactor = xcompatibleUnit
    ? parseFloat(xcompatibleUnit.conversion_factor)
    : 1.0;

  const convertedTime = data[0].time.map((t) => t * xconversionFactor);
  const minX = Math.min(...convertedTime);
  const maxX = Math.max(...convertedTime);

  let minY: number | undefined = undefined;
  let minY2: number | undefined = undefined;
  let maxY: number | undefined = undefined;
  let maxY2: number | undefined = undefined;

  const plotData = plot.y_axes
    .map((y_axis, i) => {
      const colourOffset = data.length * i;
      return data
        .map((d, index) => {
          const colourIndex = index + colourOffset;
          const colour = plotColours[colourIndex % plotColours.length];
          const group = groups?.[index - 1];
          const plotData = generatePlotData(
            d,
            visibleGroups,
            colour,
            "solid",
            index,
            group,
            y_axis,
            plot,
            units,
            model,
            variables,
            xconversionFactor,
          );
          ({ minY, maxY, minY2, maxY2 } = minMaxAxisLimits(
            plotData.y,
            minY,
            maxY,
            minY2,
            maxY2,
            y_axis.right,
          ));
          return plotData;
        })
        .concat(
          dataReference.map((d, index) => {
            const colourIndex = index + colourOffset;
            const colour = plotColours[colourIndex % plotColours.length];
            const group = groups?.[index - 1];
            const plotDataReference = generatePlotData(
              dataReference[index],
              visibleGroups,
              colour,
              "dot",
              index,
              group,
              y_axis,
              plot,
              units,
              model,
              variables,
              xconversionFactor,
              true
            );
            ({ minY, maxY, minY2, maxY2 } = minMaxAxisLimits(
              plotDataReference.y,
              minY,
              maxY,
              minY2,
              maxY2,
              y_axis.right,
            ));
            return plotDataReference;
          }),
        );
    })
    .flat() as Partial<ScatterData>[];

  const concentrationUnit = units.find((unit) => unit.symbol === "pmol/L");
  if (concentrationUnit === undefined) {
    return <>No concentration or amount unit found</>;
  }

  const icLines: number[] = genIcLines(
    units,
    plot,
    compound,
    concentrationUnit,
  );

  const yAxisVariables = plotData
    .filter((d) => !d.yaxis)
    .map((d) => d.name?.split(" ")[0]);
  const y2AxisVariables = plotData
    .filter((d) => d.yaxis)
    .map((d) => d.name?.split(" ")[0]);
  let yAxisTitle = [...new Set(yAxisVariables)].join(", ");
  let y2AxisTitle = [...new Set(y2AxisVariables)].join(", ");
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

  // setup range for y-axis
  const { rangey, rangey2 } = ranges(minY, maxY, minY2, maxY2, plot);

  const axisScaleOptions: {
    [key: string]: { type: "linear" | "log"; dtick?: number | string };
  } = {
    lin: { type: "linear" },
    lg2: { type: "log", dtick: Math.log10(2) },
    lg10: { type: "log" },
    ln: { type: "log", dtick: Math.log10(Math.E) },
  };

  const getPlotDimensions = () => {
    const buffor = 10;
    const columnCount = Math.min(plotCount, screen.width > 2500 ? 3 : 2);
    const layoutBreakpoint = 900;

    if (isVertical && !isHorizontal) {
      return dimensions.width > layoutBreakpoint
        ? {
            height: dimensions.height / 2 ,
            width: dimensions.width - buffor,
          }
        : {
            height: dimensions.height / 1.5,
            width: dimensions.width - buffor,
          };
    }

    if (!isVertical && isHorizontal) {
      return dimensions.width > layoutBreakpoint
        ? {
            height: dimensions.height,
            width: dimensions.width / columnCount - buffor,
          }
        : {
            height: dimensions.height,
            width: dimensions.width / 1.5 - buffor,
          };
    }

    return dimensions.width > layoutBreakpoint
      ? {
          height: dimensions.height / 2,
          width: dimensions.width / columnCount - buffor,
        }
      : {
          height: dimensions.height / 2,
          width: dimensions.width / columnCount - buffor,
        };
  };

  const plotLayout: Partial<Layout> = {
    autosize: false,
    width: getPlotDimensions()?.width,
    height: getPlotDimensions()?.height,
    dragmode: "pan",
    showlegend: shouldShowLegend,
    shapes: icLines.map((icLine, i) => {
      return {
        type: "line",
        x0: minX,
        y0: icLine,
        x1: maxX,
        y1: icLine,
        yref: "y",
        ysizemode: "scaled",
        label: {
          text: `Cx = ${plot.cx_lines[i].value}%`,
          font: {
            color: "rgb(0, 0, 0)",
          },
          yanchor: "top",
          xanchor: "center",
          textposition: "middle",
        },
        line: {
          color: "rgb(255, 0, 0)",
          width: 1,
          dash: "dot",
        },
      };
    }),
    legend: {
      orientation: "v",
      yanchor: "top",
      xanchor: "right",
      y: 1,
      x: 1,
    },
    xaxis: {
      title: xAxisTitle,
      automargin: true,
      exponentformat: "power",
      ...axisScaleOptions[plot.x_scale || "lin"],
    },
    yaxis: {
      title: yAxisTitle,
      automargin: true,
      range: rangey,
      exponentformat: "power",
      ...axisScaleOptions[plot.y_scale || "lin"],
    },
    yaxis2: {
      title: y2AxisTitle,
      anchor: "free",
      range: rangey2,
      overlaying: "y",
      automargin: true,
      side: "right",
      position: 1.0,
      exponentformat: "power",
      ...axisScaleOptions[plot.y2_scale || "lin"],
    },
    margin: {
      l: 50,
      r: 50,
      b: 50,
      t: 50,
      pad: 4,
    },
  };

  const editIcon: PlotlyIcon = {
    width: 500,
    height: 600,
    path: "m70.064 422.35 374.27-374.26 107.58 107.58-374.26 374.27-129.56 21.97z m70.569 417.81 110.61 110.61 z m491.47 108.37-366.69 366.68 z m54.222 507.26 40.975 39.546 z",
  };
  const removeIcon: PlotlyIcon = {
    width: 500,
    height: 600,
    path: "M507.4,411.5L507.4,411.5L351.9,256l155.5-155.5l3.7-5.6c1.9-5.6,0.9-12.1-3.7-16.8L433.8,4.6 C429.2,0,422.7-1,417.1,0.9l-5.6,3.7L256,160.1L100.5,4.6l-5.6-3.7C89.3-1,82.8,0,78.2,4.6L4.6,78.2C0,82.8-1,89.3,0.9,94.9 l3.7,5.6L160.1,256L4.6,411.5l-3.7,5.6c-1.9,5.6-0.9,12.1,3.7,16.8l73.6,73.6c4.7,4.7,11.2,5.6,16.8,3.7l5.6-3.7L256,351.9 l155.5,155.5l5.6,3.7c5.6,1.9,12.1,0.9,16.8-3.7l73.6-73.6c4.7-4.7,5.6-11.2,3.7-16.8L507.4,411.5z",
  };
  const copyIcon: PlotlyIcon = {
    width: 300,
    height: 600,
    path: "M102.17,29.66A3,3,0,0,0,100,26.79L73.62,1.1A3,3,0,0,0,71.31,0h-46a5.36,5.36,0,0,0-5.36,5.36V20.41H5.36A5.36,5.36,0,0,0,0,25.77v91.75a5.36,5.36,0,0,0,5.36,5.36H76.9a5.36,5.36,0,0,0,5.33-5.36v-15H96.82a5.36,5.36,0,0,0,5.33-5.36q0-33.73,0-67.45ZM25.91,20.41V6h42.4V30.24a3,3,0,0,0,3,3H96.18q0,31.62,0,63.24h-14l0-46.42a3,3,0,0,0-2.17-2.87L53.69,21.51a2.93,2.93,0,0,0-2.3-1.1ZM54.37,30.89,72.28,47.67H54.37V30.89ZM6,116.89V26.37h42.4V50.65a3,3,0,0,0,3,3H76.26q0,31.64,0,63.24ZM17.33,69.68a2.12,2.12,0,0,1,1.59-.74H54.07a2.14,2.14,0,0,1,1.6.73,2.54,2.54,0,0,1,.63,1.7,2.57,2.57,0,0,1-.64,1.7,2.16,2.16,0,0,1-1.59.74H18.92a2.15,2.15,0,0,1-1.6-.73,2.59,2.59,0,0,1,0-3.4Zm0,28.94a2.1,2.1,0,0,1,1.58-.74H63.87a2.12,2.12,0,0,1,1.59.74,2.57,2.57,0,0,1,.64,1.7,2.54,2.54,0,0,1-.63,1.7,2.14,2.14,0,0,1-1.6.73H18.94a2.13,2.13,0,0,1-1.59-.73,2.56,2.56,0,0,1,0-3.4ZM63.87,83.41a2.12,2.12,0,0,1,1.59.74,2.59,2.59,0,0,1,0,3.4,2.13,2.13,0,0,1-1.6.72H18.94a2.12,2.12,0,0,1-1.59-.72,2.55,2.55,0,0,1-.64-1.71,2.5,2.5,0,0,1,.65-1.69,2.1,2.1,0,0,1,1.58-.74ZM17.33,55.2a2.15,2.15,0,0,1,1.59-.73H39.71a2.13,2.13,0,0,1,1.6.72,2.61,2.61,0,0,1,0,3.41,2.15,2.15,0,0,1-1.59.73H18.92a2.14,2.14,0,0,1-1.6-.72,2.61,2.61,0,0,1,0-3.41Zm0-14.47A2.13,2.13,0,0,1,18.94,40H30.37a2.12,2.12,0,0,1,1.59.72,2.61,2.61,0,0,1,0,3.41,2.13,2.13,0,0,1-1.58.73H18.94a2.16,2.16,0,0,1-1.59-.72,2.57,2.57,0,0,1-.64-1.71,2.54,2.54,0,0,1,.65-1.7ZM74.3,10.48,92.21,27.26H74.3V10.48Z",
    transform: "scale(4.5)",
  };

  const config: Partial<Config> = {
    modeBarButtonsToAdd: [
      {
        name: "Copy to Clipboard",
        title: "Copy to Clipboard",
        click: handleCopyToClipboard,
        icon: copyIcon,
      },
      {
        name: "Customise Plot",
        title: "Customise Plot",
        click: handleCustomisePlot,
        icon: editIcon,
      },
      {
        name: "Remove Plot",
        title: "Remove Plot",
        click: handleRemovePlot,
        icon: removeIcon,
      },
    ],
    displaylogo: false,
    scrollZoom: true,
  };

  const biomarkerVariables =
    subjectBiomarkers?.map((d) => {
      const observation = d?.[0];
      const variable = variables.find((v) => v.qname === observation?.qname);
      return variable?.id;
    }) || [];
  let combinedPlotData = [...plotData];
  plot.y_axes.forEach((y_axis, i) => {
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
    const scatterplotData = groups?.map((group, index) => {
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
    });
    combinedPlotData = combinedPlotData.concat(
      scatterplotData as ScatterData[],
    );
  });

  return (
    <>
      <Plot
        data={combinedPlotData as Data[]}
        layout={plotLayout}
        style={{ width: "100%", height: "100%" }}
        config={config}
      />
      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        maxWidth="lg"
        sx={{ maxHeight: "90%", top: "5rem" }}
      >
        <DialogTitle sx={{ fontWeight: "bold" }}>Customise Plot</DialogTitle>
        <DialogContent>
          <SimulationPlotForm
            index={index}
            variables={variables}
            plot={plot}
            control={control}
            setValue={setValue}
            units={units}
            compound={compound}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDelete}>Delete</Button>
          <Button onClick={handleClose}>Done</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SimulationPlotView;
