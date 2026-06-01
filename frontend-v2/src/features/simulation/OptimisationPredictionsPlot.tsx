import { FC } from "react";
import createPlotlyComponent from "react-plotly.js/factory";
import Plotly from "plotly.js-basic-dist-min";
import { Data, Layout, ScatterData } from "plotly.js";
import { Box } from "@mui/material";
import {
  CombinedModelRead,
  CompoundRead,
  SimulateResponse,
  SimulationPlot,
  SubjectGroupRead,
  UnitRead,
  VariableRead,
  useEfficacyExperimentRetrieveQuery,
} from "../../app/backendApi";
import { SubjectBiomarker } from "../../hooks/useDataset";
import {
  createPlots,
  generateScatterPlots,
  genIcLines,
  getDefaultAxisTitles,
  getICLineShapes,
  getPlotAxes,
  getPlotLayout,
  getYRanges,
  ScatterDataWithVariable,
} from "./utils";

const Plot = createPlotlyComponent(Plotly);

interface OptimisationPredictionsPlotProps {
  predictions: SimulateResponse[];
  plots: SimulationPlot[];
  variables: VariableRead[];
  units: UnitRead[];
  groups: SubjectGroupRead[] | undefined;
  subjectBiomarkers: SubjectBiomarker[][] | undefined;
  model: CombinedModelRead;
  compound: CompoundRead;
  visibleGroups: string[];
}

/**
 * Renders one Plotly chart per simulation plot configuration, reusing the
 * same createPlots / generateScatterPlots / layout helpers as SimulationPlotView
 * so the styling is identical.
 */
const OptimisationPredictionsPlot: FC<OptimisationPredictionsPlotProps> = ({
  predictions,
  plots,
  variables,
  units,
  groups,
  subjectBiomarkers,
  model,
  compound,
  visibleGroups,
}) => {
  const { data: efficiencyExperiment } = useEfficacyExperimentRetrieveQuery(
    { id: compound.use_efficacy || 0 },
    { skip: !compound.use_efficacy },
  );

  const timeVariable = variables.find((v) => v.binding === "time");
  const timeUnit = units.find((u) => u.id === timeVariable?.unit);

  const biomarkerVariables =
    subjectBiomarkers?.map((d) => {
      const observation = d?.[0];
      const variable = variables.find((v) => v.qname === observation?.qname);
      return variable?.id;
    }) ?? [];

  const concentrationUnit = units.find((unit) => unit.symbol === "pmol/L");

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {plots.map((plot, plotIdx) => {
        const plotWithId = plot as SimulationPlot & { id: string };

        // x-axis unit conversion (same logic as SimulationPlotView)
        const xAxisUnit = units.find((u) => u.id === plot.x_unit);
        const xCompatibleUnit = timeUnit?.compatible_units.find(
          (u) => parseInt(u.id) === xAxisUnit?.id,
        );
        const xConversionFactor = xCompatibleUnit
          ? parseFloat(xCompatibleUnit.conversion_factor)
          : 1.0;

        const plotData = createPlots({
          data: predictions,
          dataReference: [],
          groups,
          model,
          plot: plotWithId,
          units,
          variables,
          visibleGroups,
          xConversionFactor,
        }).flat() as Partial<ScatterDataWithVariable>[];

        // --- Lines 132–191 of SimulationPlotView ---
        const yRanges = getYRanges({ plotData });

        const icLines: number[] = concentrationUnit
          ? genIcLines(units, plotWithId, efficiencyExperiment, concentrationUnit)
          : [];

        const convertedTime =
          predictions[0]?.time.map((t) => t * xConversionFactor) ?? [];
        const minX = convertedTime.length ? Math.min(...convertedTime) : 0;
        const maxX = convertedTime.length ? Math.max(...convertedTime) : 1;
        const icLineShapes = getICLineShapes({ icLines, minX, maxX, plot: plotWithId });

        const yAxisVariableNames = plotData
          .filter((d) => !d.yaxis)
          .map((d) => d.variable)
          .filter(Boolean);
        const y2AxisVariableNames = plotData
          .filter((d) => d.yaxis)
          .map((d) => d.variable)
          .filter(Boolean);

        const defaultAxisTitles = getDefaultAxisTitles({
          plot: plotWithId,
          units,
          yAxisVariableNames,
          y2AxisVariableNames,
        });

        const plotAxes: Partial<Layout> = getPlotAxes({
          plot: plotWithId,
          xAxisTitle: plot.x_label || defaultAxisTitles.xAxisTitle,
          yAxisTitle: plot.y_label || defaultAxisTitles.yAxisTitle,
          y2AxisTitle: plot.y2_label || defaultAxisTitles.y2AxisTitle,
          yRanges,
        });

        const basePlotLayout = getPlotLayout({
          plotDimensions: { width: 0, height: 400 },
          shouldShowLegend: true,
        });

        const plotLayout: Partial<Layout> = {
          ...basePlotLayout,
          ...plotAxes,
          autosize: true,
          width: undefined,
          shapes: icLineShapes,
        };
        // --- end SimulationPlotView replication ---

        let combinedData = [...plotData];
        plot.y_axes.forEach((y_axis, i) => {
          const scatterData = generateScatterPlots({
            biomarkerVariables,
            data: predictions,
            groups,
            i,
            model,
            plot: plotWithId,
            subjectBiomarkers,
            units,
            visibleGroups,
            y_axis,
          });
          if (scatterData) {
            combinedData = combinedData.concat(scatterData as ScatterData[]);
          }
        });

        return (
          <Plot
            key={plotIdx}
            data={combinedData as Data[]}
            layout={plotLayout}
            style={{ width: "100%", height: 400 }}
            useResizeHandler
          />
        );
      })}
    </Box>
  );
};

export default OptimisationPredictionsPlot;
