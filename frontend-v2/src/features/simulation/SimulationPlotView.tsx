import { FC, useState } from "react";
import createPlotlyComponent from "react-plotly.js/factory";
import {
  CombinedModelRead,
  CompoundRead,
  SimulateResponse,
  Simulation,
  UnitRead,
  VariableRead,
  useProtocolListQuery,
} from "../../app/backendApi";
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
  generateScatterPlots,
  genIcLines,
  getICLineShapes,
  getAxisTitles,
  getPlotDimensions,
  getPlotLayout,
  getYRanges,
  ScatterDataWithVariable,
  getPlotAxes,
} from "./utils";
import { useConfig } from "./config";

const Plot = createPlotlyComponent(Plotly);

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
  plotCount,
}) => {
  const projectId = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  useProtocolListQuery({ projectId: projectId || 0 }, { skip: !projectId });

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

  const timeVariable = variables.find((v) => v.binding === "time");
  const timeUnit = units.find((u) => u.id === timeVariable?.unit);
  const xAxisUnit = units.find((u) => u.id === plot.x_unit);
  const xCompatibleUnit = timeUnit?.compatible_units.find(
    (u) => parseInt(u.id) === xAxisUnit?.id,
  );
  const xConversionFactor = xCompatibleUnit
    ? parseFloat(xCompatibleUnit.conversion_factor)
    : 1.0;

  const plotData = createPlots({
    data,
    dataReference,
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
    compound,
    concentrationUnit,
  );
  const convertedTime = data[0].time.map((t) => t * xConversionFactor);
  const minX = Math.min(...convertedTime);
  const maxX = Math.max(...convertedTime);
  const icLineShapes = getICLineShapes({ icLines, minX, maxX, plot });

  const { xAxisTitle, yAxisTitle, y2AxisTitle } = getAxisTitles({
    plot,
    plotData,
    units,
  });

  const plotDimensions = getPlotDimensions({
    isVertical,
    isHorizontal,
    dimensions,
    plotCount,
  });

  const plotAxes: Partial<Layout> = getPlotAxes({
    plot,
    xAxisTitle,
    yAxisTitle,
    y2AxisTitle,
    yRanges,
  });

  const basePlotLayout: Partial<Layout> = getPlotLayout({
    plotDimensions,
    shouldShowLegend,
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
