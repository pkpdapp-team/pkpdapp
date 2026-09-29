import { FC, useState } from "react";
import createPlotlyComponent from "react-plotly.js/factory";
import {
  CombinedModelRead,
  CompoundRead,
  SimulateResponse,
  Simulation,
  VariableRead,
  useEfficacyExperimentRetrieveQuery,
  useProtocolListQuery,
} from "../../app/backendApi";
import { CentralSimulateResponse } from "./types";
import { UnitReadWithCompatible } from "../../shared/unitConversion";
import { Data, Layout, ScatterData } from "plotly.js";
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
import {
  createPlots,
  generateHistogramPlots,
  generateScatterPlots,
  genIcLines,
  getICLineShapes,
  getPlotDimensions,
  getPlotLayout,
  getYRanges,
  ScatterDataWithVariable,
  getPlotAxes,
  getDefaultAxisTitles,
} from "./utils";
import { useConfig } from "./config";
import parameterDisplayName from "../model/parameters/parameterDisplayName";

const Plot = createPlotlyComponent(Plotly);

interface SimulationPlotProps {
  index: number;
  plot: FieldArrayWithId<Simulation, "plots", "id">;
  data: CentralSimulateResponse[];
  uncertaintyData: SimulateResponse[];
  dataReference: CentralSimulateResponse[];
  uncertaintyReferenceData: SimulateResponse[];
  variables: VariableRead[];
  control: Control<Simulation>;
  setValue: UseFormSetValue<Simulation>;
  remove: (index: number) => void;
  units: UnitReadWithCompatible[];
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
  uncertaintyData,
  dataReference,
  uncertaintyReferenceData,
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
  plotCount,
}) => {
  const projectId = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  useProtocolListQuery({ projectId: projectId || 0 }, { skip: !projectId });

  const { data: efficiencyExperiment } = useEfficacyExperimentRetrieveQuery(
    { id: compound.use_efficacy || 0 },
    { skip: !compound.use_efficacy },
  );

  const { groups } = useSubjectGroups();
  const { subjectBiomarkers } = useDataset(projectId);
  const [open, setOpen] = useState(false);
  const config = useConfig({ remove, setOpen, index });

  const handleClose = () => {
    setOpen(false);
  };

  const handleDelete = () => {
    remove(index);
    setOpen(false);
  };

  const plotDimensions = getPlotDimensions({
    isVertical,
    isHorizontal,
    dimensions,
    plotCount,
  });
  const basePlotLayout: Partial<Layout> = getPlotLayout({
    plotDimensions,
    shouldShowLegend,
  });

  // A plot whose (single) y-axis variable is a constant parameter is rendered as
  // a histogram of that parameter's Monte-Carlo sampled values (returned by the
  // simulate endpoint under `parameters`), overlaid one trace per visible group.
  const histogramVariableId = plot.y_axes[0]?.variable;
  const histogramVariable = variables.find(
    (v) => v.id === histogramVariableId,
  );
  const isHistogram = Boolean(histogramVariable?.constant);

  if (isHistogram) {
    const histogramData = generateHistogramPlots(
      uncertaintyData,
      groups,
      visibleGroups,
      histogramVariableId,
    );
    const xUnit = units.find((u) => u.id === plot.x_unit);
    const defaultXTitle = histogramVariable
      ? `${parameterDisplayName(histogramVariable, model)}${
          xUnit?.symbol ? ` (${xUnit.symbol})` : ""
        }`
      : "";
    const xAxisType: Layout["xaxis"]["type"] =
      plot.x_scale && plot.x_scale !== "lin" ? "log" : "linear";
    const histogramLayout: Partial<Layout> = {
      ...basePlotLayout,
      barmode: "overlay",
      xaxis: {
        title: { text: plot.x_label || defaultXTitle },
        type: xAxisType,
        exponentformat: "power",
      },
      yaxis: {
        title: { text: plot.y_label || "Count" },
        exponentformat: "power",
      },
    };
    return (
      <>
        <Plot
          data={histogramData as Data[]}
          layout={histogramLayout}
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
  }

  const timeVariable = variables.find((v) => v.binding === "time");
  const timeUnit = units.find((u) => u.id === timeVariable?.unit);
  const xAxisUnit = units.find((u) => u.id === plot.x_unit);
  const xCompatibleUnit = timeUnit?.compatible_units.find(
    (u) => u.id === xAxisUnit?.id,
  );
  const xConversionFactor = xCompatibleUnit
    ? xCompatibleUnit.conversion_factor
    : 1.0;

  const plotData = createPlots({
    data,
    uncertaintyData,
    dataReference,
    uncertaintyReferenceData,
    groups,
    model,
    plot,
    units,
    variables,
    visibleGroups,
    xConversionFactor,
  }).flat() as Partial<ScatterDataWithVariable>[];

  const yRanges = getYRanges({ plotData });

  const concentrationUnit = units.find((unit) => unit.symbol === "pmol/L");
  if (concentrationUnit === undefined) {
    return <>No concentration or amount unit found</>;
  }

  const icLines: number[] = genIcLines(
    units,
    plot,
    efficiencyExperiment,
    concentrationUnit,
  );
  const convertedTime = data[0].time.map((t) => t * xConversionFactor);
  const minX = Math.min(...convertedTime);
  const maxX = Math.max(...convertedTime);
  const icLineShapes = getICLineShapes({ icLines, minX, maxX, plot });

  const yAxisVariableNames = plotData
    .filter((d) => !d.yaxis)
    .map((d) => d.variable)
    .filter(Boolean);
  const y2AxisVariableNames = plotData
    .filter((d) => d.yaxis)
    .map((d) => d.variable)
    .filter(Boolean);

  const defaultAxisTitles = getDefaultAxisTitles({
    plot,
    units,
    yAxisVariableNames,
    y2AxisVariableNames,
  });

  const plotAxes: Partial<Layout> = getPlotAxes({
    plot,
    xAxisTitle: plot.x_label || defaultAxisTitles.xAxisTitle,
    yAxisTitle: plot.y_label || defaultAxisTitles.yAxisTitle,
    y2AxisTitle: plot.y2_label || defaultAxisTitles.y2AxisTitle,
    yRanges,
  });

  const plotLayout: Partial<Layout> = {
    ...basePlotLayout,
    ...plotAxes,
    shapes: icLineShapes,
  };

  const biomarkerVariables =
    subjectBiomarkers?.map((d) => {
      const observation = d?.[0];
      const variable = variables.find((v) => v.qname === observation?.qname);
      return variable?.id;
    }) || [];
  let combinedPlotData = [...plotData];
  plot.y_axes.forEach((y_axis, i) => {
    const scatterplotData = generateScatterPlots({
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
