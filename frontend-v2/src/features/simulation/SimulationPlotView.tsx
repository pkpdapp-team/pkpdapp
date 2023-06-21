import React, { useState } from 'react';
import Plot from 'react-plotly.js';
import { Compound, SimulateResponse, Simulation, SimulationPlot, Unit, Variable } from '../../app/backendApi';
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
  compound: Compound,
}

const SimulationPlotView: React.FC<SimulationPlotProps> = ({ index, plot, data, variables, control, setValue, remove, units, compound }) => {

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

  const minX = Math.min(...data.time);
  const maxX = Math.max(...data.time);

  let plotData: Data[] = plot.y_axes.map((y_axis) => {
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
  let icLines: number[] = [];

  const concentrationUnit = units.find((unit) => unit.symbol === "pmol/L");
  if (concentrationUnit === undefined) {
    return (<>No concentration or amount unit found</>);
  }
  const concentrationUnitIds = concentrationUnit.compatible_units.map((unit) => parseInt(unit.id));
  const yAxisIsConcentration = plot.y_unit ? concentrationUnitIds.includes(plot.y_unit) : false;

  if (yAxisIsConcentration && compound.efficacy_experiments.length > 0) {
    const exp = compound.efficacy_experiments[0];
    if (exp.hill_coefficient && exp.c50 ) {
      const yAxisUnit = units.find((unit) => unit.id === plot.y_unit);
      const c50Unit = units.find((unit) => unit.id === exp.c50_unit);
      const compatibleUnit = c50Unit?.compatible_units.find((u) => parseInt(u.id) === yAxisUnit?.id);
      const factor = compatibleUnit ? parseFloat(compatibleUnit.conversion_factor) : 1.0;
      icLines = plot.cx_lines.map((cx_line) => {
        const hc = exp.hill_coefficient || 1.0;
        const ec50 = exp.c50 || 0.0;
        const cx = cx_line.value / (100.0 - cx_line.value);
        const iCx = cx^(1.0/hc) * ec50; 
        return iCx * factor;
      });
    }
  }


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


  console.log('icLines', icLines)
  const plotLayout: Partial<Layout> = {
    shapes: icLines.map((icLine, i) => {
      return {
        type: 'line',
        x0: minX,
        y0: icLine,
        x1: maxX,
        y1: icLine,
        yref: 'y',
        ysizemode: 'scaled',
        label: {
          text: `Cx = ${plot.cx_lines[i].value}%`,
          font: {
            color: 'rgb(0, 0, 0)',
          },
          yanchor: 'top',
          xanchor: 'middle',
          textposition: 'middle',
        },
        line: {
          color: 'rgb(255, 0, 0)',
          width: 1,
          dash: 'dot'
        }
      }
    }),
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