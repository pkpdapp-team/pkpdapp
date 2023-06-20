import React, { useState } from 'react';
import Plot from 'react-plotly.js';
import { SimulateResponse, Simulation, SimulationPlot, Unit, Variable } from '../../app/backendApi';
import { Config, Data, Layout, Icon as PlotlyIcon } from 'plotly.js';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { Control, UseFormSetValue } from 'react-hook-form';
import SimulationPlotForm from './SimulationPlotForm';

interface SimulationPlotProps {
  index: number;
  plot: SimulationPlot;
  data: SimulateResponse;
  variables: Variable[];
  control: Control<Simulation>,
  setValue: UseFormSetValue<Simulation>,
  remove: (index: number) => void,
  units: Unit[],
}

const SimulationPlotView: React.FC<SimulationPlotProps> = ({ index, plot, data, variables, control, setValue, remove, units }) => {

  const [open, setOpen] = useState(false);

  const handleCustomisePlot = () => {
    setOpen(true);

  }

  const handleClose = () => {
    setOpen(false);
  }

  const handleDelete = () => {
    remove(index);
    setOpen(false);
  }

  const plotData: Data[] = plot.y_axes.map((y_axis) => {
    const variableValues = data.outputs[y_axis.variable];
    const variable = variables.find((v) => v.id === y_axis.variable);
    const variableName = variable?.name;
    const variableUnit = units.find((u) => u.id === variable?.unit);
    const axisUnit = y_axis.right ? units.find((u) => u.id === plot.y_unit2) : units.find((u) => u.id === plot.y_unit);
    const compatibleUnit = variableUnit?.compatible_units.find((u) => parseInt(u.id) === axisUnit?.id);
    const conversionFactor = compatibleUnit ? parseFloat(compatibleUnit.conversion_factor) : 1.0;
    console.log(`converting from ${variableUnit?.symbol} to ${axisUnit?.symbol} using ${conversionFactor}}`, compatibleUnit)
    if (variableValues) {
      return {
        yaxis: y_axis.right ? 'y2' : undefined,
        x: data.time,
        y: variableValues.map((v) => v * conversionFactor),
        name: variableName || 'unknown',
      }
    } else {
      return {
        yaxis: y_axis.right ? 'y2' : undefined,
        x: [],
        y: [],
        type: 'scatter',
        name: `${y_axis.variable}`,
      }
    }
  });


  //@ts-expect-error
  let yAxisTitle = plotData.filter((d) => !d.yaxis).map((d) => d.name).join(', ');
  //@ts-expect-error
  let y2AxisTitle = plotData.filter((d) => d.yaxis).map((d) => d.name).join(', ');
  let xAxisTitle = 'Time';
  const yUnit = units.find((u) => u.id === plot.y_unit);
  const y2Unit = units.find((u) => u.id === plot.y_unit2);
  const xUnit = units.find((u) => u.id === plot.x_unit);
  if (yUnit) {
    yAxisTitle = `${yAxisTitle}  [${yUnit.symbol}]`
  }
  if (y2Unit) {
    y2AxisTitle = `${y2AxisTitle}  [${y2Unit.symbol}]`
  }
  if (xUnit) {
    xAxisTitle = `${xAxisTitle}  [${xUnit.symbol}]`
  }


  const plotLayout: Partial<Layout> = {
    legend: {
      orientation: 'v',
      yanchor: 'top',
      xanchor: 'right',
      y: 1,
      x: 1,
    },
    xaxis: {
      title: xAxisTitle,
    },
    yaxis: {
      title: yAxisTitle,
    },
    yaxis2: {
      title: y2AxisTitle,
      anchor: 'free',
      overlaying: 'y',
      side: 'right',
      position: 1.0
    },
    margin: {
      l: 50,
      r: 50,
      b: 50,
      t: 50,
      pad: 4
    }
  }

  const plus: PlotlyIcon = {
    'width': 500,
    'height': 600,
    'path': 'M 0,0 500,0 500,500 0,500 z M 250,100 400,100 400,250 250,250 250,400 100,400 100,250 250,250 250,100 z',
  }

  const config: Partial<Config> = {
    modeBarButtonsToAdd: [
      {
        name: 'Customise Plot',
        title: 'Customise Plot',
        click: handleCustomisePlot,
        //icon: Plotly.Icons.pencil,
        icon: plus,

      },
    ],
    displaylogo: false,
  }
  return (
    <>
      <Plot
        data={plotData}
        layout={plotLayout}
        style={{ width: '100%', height: '100%' }}
        config={config}
      />
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth='sm'>
        <DialogTitle>Customise Plot</DialogTitle>
        <DialogContent>
          <SimulationPlotForm index={index} variables={variables} plot={plot} control={control} setValue={setValue} />
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