import React, { useState } from 'react';
import Plot from 'react-plotly.js';
import { SimulateResponse, Simulation, SimulationPlot, Variable } from '../../app/backendApi';
import Plotly, { Config, Data, Layout, Icon as PlotlyIcon } from 'plotly.js';
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

}

const SimulationPlotView: React.FC<SimulationPlotProps> = ({ index, plot, data, variables, control, setValue, remove }) => {

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