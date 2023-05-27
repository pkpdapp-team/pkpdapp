import React from 'react';
import Plot from 'react-plotly.js';
import { SimulateResponse, SimulationPlot, Variable } from '../../app/backendApi';
import { Data, Layout, PlotData, PlotType } from 'plotly.js';

interface SimulationPlotProps {
  plot: SimulationPlot;
  data: SimulateResponse;
  variables: Variable[];
}

const SimulationPlotView: React.FC<SimulationPlotProps> = ({ plot, data, variables }) => {

  const plotData: Data[] = plot.y_axes.map((y_axis) => {
    const variableValues = data.outputs[y_axis.variable];
    const variableName = variables.find((v) => v.id === y_axis.variable)?.name;
    if (variableValues) {
      return {
        x: data.time,
        y: variableValues,
        name: variableName || 'unknown',
      }
    } else {
      return {
        x: [],
        y: [],
        type: 'scatter',
        name: `${y_axis.variable}`,
      }
    }
  });
  const plotLayout: Partial<Layout> = {
    xaxis: {
      title: 'Time',
    },
    yaxis: {
      title: plotData.map((d) => d.name).join(', '),
    },
  }
  return (
    <Plot
      data={plotData}
      layout={plotLayout}
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default SimulationPlotView;