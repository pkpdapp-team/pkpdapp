import React, { useState } from 'react';
import Plot from 'react-plotly.js';
import { Compound, SimulateResponse, Simulation, SimulationPlot, Unit, Variable } from '../../app/backendApi';
import { Config, Data, Icons, Layout, Icon as PlotlyIcon } from 'plotly.js';
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

  const handleRemovePlot = () => {
    remove(index);
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

  const timeVariable = variables.find((v) => v.binding === 'time');
  const timeUnit = units.find((u) => u.id === timeVariable?.unit);
  const xaxisUnit = units.find((u) => u.id === plot.x_unit);
  const xcompatibleUnit = timeUnit?.compatible_units.find((u) => parseInt(u.id) === xaxisUnit?.id);
  const xconversionFactor = xcompatibleUnit ? parseFloat(xcompatibleUnit.conversion_factor) : 1.0;
  let plotData: Data[] = plot.y_axes.map((y_axis) => {
    const variableValues = data.outputs[y_axis.variable];
    const variable = variables.find((v) => v.id === y_axis.variable);
    const variableName = variable?.name;
    const variableUnit = units.find((u) => u.id === variable?.unit);

    const yaxisUnit = y_axis.right ? units.find((u) => u.id === plot.y_unit2) : units.find((u) => u.id === plot.y_unit);
    const ycompatibleUnit = variableUnit?.compatible_units.find((u) => parseInt(u.id) === yaxisUnit?.id);
    const yconversionFactor = ycompatibleUnit ? parseFloat(ycompatibleUnit.conversion_factor) : 1.0;

    if (variableValues) {
      return {
        yaxis: y_axis.right ? 'y2' : undefined,
        x: data.time.map((t) => t * xconversionFactor),
        y: variableValues.map((v) => v * yconversionFactor),
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
        const iCx = cx**(1.0/hc) * ec50; 
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
      automargin: true,
    },
    yaxis: {
      title: yAxisTitle,
      automargin: true,
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

  const editIcon: PlotlyIcon = {
    'width': 500,
    'height': 600,
    'path': 'm70.064 422.35 374.27-374.26 107.58 107.58-374.26 374.27-129.56 21.97z m70.569 417.81 110.61 110.61 z m491.47 108.37-366.69 366.68 z m54.222 507.26 40.975 39.546 z'
  }
  const removeIcon: PlotlyIcon = {
    'width': 500,
    'height': 600,
    'path': 'M507.4,411.5L507.4,411.5L351.9,256l155.5-155.5l3.7-5.6c1.9-5.6,0.9-12.1-3.7-16.8L433.8,4.6 C429.2,0,422.7-1,417.1,0.9l-5.6,3.7L256,160.1L100.5,4.6l-5.6-3.7C89.3-1,82.8,0,78.2,4.6L4.6,78.2C0,82.8-1,89.3,0.9,94.9 l3.7,5.6L160.1,256L4.6,411.5l-3.7,5.6c-1.9,5.6-0.9,12.1,3.7,16.8l73.6,73.6c4.7,4.7,11.2,5.6,16.8,3.7l5.6-3.7L256,351.9 l155.5,155.5l5.6,3.7c5.6,1.9,12.1,0.9,16.8-3.7l73.6-73.6c4.7-4.7,5.6-11.2,3.7-16.8L507.4,411.5z'
  }


  const config: Partial<Config> = {
    modeBarButtonsToAdd: [
      {
        name: 'Customise Plot',
        title: 'Customise Plot',
        click: handleCustomisePlot,
        icon: editIcon,

      },
      {
        name: 'Remove Plot',
        title: 'Remove Plot',
        click: handleRemovePlot,
        icon: removeIcon,

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
          <SimulationPlotForm index={index} variables={variables} plot={plot} control={control} setValue={setValue} units={units} />
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