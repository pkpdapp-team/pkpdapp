import React from 'react';
import { Control, useFieldArray } from 'react-hook-form';
import { Simulation, SimulationPlot, Variable, useUnitListQuery } from '../../app/backendApi';
import { Button, Grid, Typography } from '@mui/material';
import TextField from '../../components/TextField';
import UnitField from '../../components/UnitField';
import SelectField from '../../components/SelectField';
import Checkbox from '../../components/Checkbox';
import DropdownButton from '../../components/DropdownButton';

interface SimulationPlotFormProps {
  index: number;
  plot: SimulationPlot;
  variables: Variable[];
  control: Control<Simulation>,
}

const SimulationPlotForm: React.FC<SimulationPlotFormProps> = ({ index, plot, variables, control }) => {
  const { data: units, isLoading: unitsLoading } = useUnitListQuery()
  const baseXUnitId = units ? units.find((u) => u.symbol === 'h')?.id : undefined;

  const { fields: y_axes, append: addYAxis, remove: removeYAxis } = useFieldArray({
    control,
    name: `plots.${index}.y_axes`,
  });

  const { fields: cx_lines, append: addCxLines, remove: removeCxLines } = useFieldArray({
    control,
    name: `plots.${index}.cx_lines`,
  });

  if (unitsLoading) {
    return <div>Loading...</div>
  }

  let baseYUnitId = y_axes.length > 0 ? variables.find(v => v.id === y_axes[0].variable)?.unit : undefined; 
  if (baseYUnitId === null) {
    baseYUnitId = undefined;
  }
  let baseY2UnitId = y_axes.length > 0 ? variables.find(v => v.id === y_axes[0].variable)?.unit : undefined;
  if (baseY2UnitId === null) {
    baseY2UnitId = undefined;
  }

  const handleAddYAxis = (variableId: number) => {
    addYAxis({
      id: 0,
      variable: variableId,
      plot: 0,
      right: false,
    });
  }

  const handleRemoveYAxis = (yAxisIndex: number) => {
    removeYAxis(yAxisIndex);
  }

  const handleAddCxLine = (value: number) => {
    addCxLines({
      value,
      id: 0,
      plot: 0,
    });
  }

  const handleRemoveCxLine = (cxLineIndex: number) => {
    removeCxLines(cxLineIndex);
  }

  const addYAxisOptions = variables.filter(v => !v.constant).map((v) => ({ label: v.name, value: v.id }));
  const addCxLineOptions = Array.from({ length: 6 }, (_, i) => i / 5).map((v) => ({ label: v.toString(), value: v })); 

  return (
    <>
    <Grid container spacing={2}>
        <Grid item xs={4}>
        <UnitField
            label="Name"
            name={`plots.${index}.x_unit`}
            control={control}
            baseUnitId={baseXUnitId}
        />
        </Grid>
        <Grid item xs={4}>
        <UnitField
            label="Y Axis Unit"
            name={`plots.${index}.y_unit`}
            control={control}
            baseUnitId={baseYUnitId}
            selectProps={{disabled: y_axes.length === 0}}
        />
        </Grid>
        <Grid item xs={4}>
        <UnitField
            label="Y2 Axis Unit"
            name={`plots.${index}.y_unit2`}
            control={control}
            baseUnitId={baseY2UnitId}
            selectProps={{disabled: y_axes.length === 0}}
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
            <Checkbox
                label="Right"
                name={`plots.${index}.y_axes.${yAxisIndex}.right`}
                control={control}
            />
            </Grid>
            <Grid item xs={6}>
            <Button onClick={() => handleRemoveYAxis(yAxisIndex)}>Remove</Button>
            </Grid>
        </Grid>
        </div>
    ))}
    <DropdownButton options={addYAxisOptions} onOptionSelected={handleAddYAxis} >
      {"add y axis"}
    </DropdownButton>
    <Typography variant='h3'>Cx Lines</Typography>
    {cx_lines.map((cxLine, cxLineIndex) => (
        <div key={cxLineIndex}>
        <Grid container spacing={2}>
            <Grid item xs={6}>
            <TextField
                label="Cx"
                name={`plots.${index}.cx_lines.${cxLineIndex}.value`}
                control={control}
                textFieldProps={{ type: 'number' }}
            />
            </Grid>
            <Grid item xs={6}>
            <Button onClick={() => handleRemoveCxLine(cxLineIndex)}>Remove</Button>
            </Grid>
        </Grid>
        </div>
    ))}
    <DropdownButton options={addCxLineOptions} onOptionSelected={handleAddCxLine} >
      {"add Cx line"}
    </DropdownButton>
    </>
  );
}

export default SimulationPlotForm;