import React from 'react';
import { Control, UseFormSetValue, useFieldArray } from 'react-hook-form';
import { Simulation, SimulationPlot, Variable } from '../../app/backendApi';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Typography } from '@mui/material';
import TextField from '../../components/TextField';
import UnitField from '../../components/UnitField';
import SelectField from '../../components/SelectField';
import Checkbox from '../../components/Checkbox';

interface SimulationPlotFormProps {
  index: number;
  plot: SimulationPlot;
  variables: Variable[];
  control: Control<Simulation>,
}

const SimulationPlotForm: React.FC<SimulationPlotFormProps> = ({ index, plot, variables, control }) => {

  const { fields: y_axes, append: addYAxis, remove: removeYAxis } = useFieldArray({
    control,
    name: `plots.${index}.y_axes`,
  });

  const { fields: cx_lines, append: addCxLines, remove: removeCxLines } = useFieldArray({
    control,
    name: `plots.${index}.cx_lines`,
  });


  const handleAddYAxis = () => {
    addYAxis({
        variable: '',
        unit: '',
        scale: 'linear',
    });
  }

  const handleRemoveYAxis = (yAxisIndex: number) => {
    removeYAxis(yAxisIndex);
  }

  const handleAddCxLine = () => {
    addCxLines({
      x: '',
      x_unit: '',
      color: '',
    });
  }

  const handleRemoveCxLine = (cxLineIndex: number) => {
    removeCxLines(cxLineIndex);
  }

  return (
    <>
    <Grid container spacing={2}>
        <Grid item xs={4}>
        <UnitField
            label="Name"
            name={`plots.${index}.x_unit`}
            control={control}
        />
        </Grid>
        <Grid item xs={4}>
        <UnitField
            label="Y Axis Unit"
            name={`plots.${index}.y_unit`}
            control={control}
        />
        </Grid>
        <Grid item xs={4}>
        <UnitField
            label="Y2 Axis Unit"
            name={`plots.${index}.y_unit2`}
            control={control}
        />
        </Grid>
        <Grid item xs={4}>
        <Checkbox
            label="Calculate Receptor Occupancy"
            name={`plots.${index}.receptor_occupancy`}
            control={control}
        />  
        </Grid>
    </Grid>
    <Typography variant='h3'>Y Axes</Typography>
    {y_axes.map((yAxis, yAxisIndex) => (
        <div key={yAxisIndex}>
        <Grid container spacing={2}>
            <Grid item xs={6}>
            <SelectField
                label="Variable"
                name={`plots.${index}.y_axes.${yAxisIndex}.variable`}
                options={variables.filter((v) => !v.constant).map((v) => ({ value: v.id, label: v.name }))}
                control={control}
            />
            </Grid>
            <Grid item xs={6}>
            <Button onClick={() => handleRemoveYAxis(yAxisIndex)}>Remove</Button>
            </Grid>
        </Grid>
        </div>
    ))}
    <Button onClick={handleAddYAxis}>Add Y Axis</Button>
    <Typography variant='h3'>Cx Lines</Typography>
    {cx_lines.map((cxLine, cxLineIndex) => (
        <div key={cxLineIndex}>
        <Grid container spacing={2}>
            <Grid item xs={6}>
            <TextField
                label="Cx"
                name={`plots.${index}.cx_lines.${cxLineIndex}.value`}
                control={control}
            />
            </Grid>
            <Grid item xs={6}>
            <Button onClick={() => handleRemoveCxLine(cxLineIndex)}>Remove</Button>
            </Grid>
        </Grid>
        </div>
    ))}
    <Button onClick={handleAddCxLine}>Add Cx Line</Button>
    </>
  );
}

export default SimulationPlotForm;