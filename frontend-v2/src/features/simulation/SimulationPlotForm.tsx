import React from 'react';
import { Control, UseFormSetValue, useFieldArray } from 'react-hook-form';
import { Compound, Simulation, SimulationPlot, SimulationYAxis, Unit, Variable, useUnitListQuery } from '../../app/backendApi';
import { Divider, Grid, IconButton, List, ListItem, Stack, Typography } from '@mui/material';
import TextField from '../../components/TextField';
import UnitField from '../../components/UnitField';
import SelectField from '../../components/SelectField';
import Checkbox from '../../components/Checkbox';
import DropdownButton from '../../components/DropdownButton';
import { Add, Delete } from '@mui/icons-material';

interface SimulationPlotFormProps {
  index: number;
  plot: SimulationPlot;
  variables: Variable[];
  control: Control<Simulation>,
  setValue: UseFormSetValue<Simulation>,
  units: Unit[],
  compound: Compound,
}

const SimulationPlotForm: React.FC<SimulationPlotFormProps> = ({ index, plot, variables, control, setValue, units, compound }) => {
  const baseXUnitId = units ? units.find((u) => u.symbol === 'h')?.id : undefined;

  const { fields: y_axes, append: addYAxis, remove: removeYAxis } = useFieldArray({
    control,
    name: `plots.${index}.y_axes`,
  });

  const { fields: cx_lines, append: addCxLines, remove: removeCxLines } = useFieldArray({
    control,
    name: `plots.${index}.cx_lines`,
  });



  const concentrationUnit = units.find((unit) => unit.symbol === "pmol/L");
  if (concentrationUnit === undefined) {
    return (<>No concentration or amount unit found</>);
  }
  const concentrationUnitIds = concentrationUnit.compatible_units.map((unit) => parseInt(unit.id));
  const concentrationVariables = variables.filter((variable) => variable.unit && concentrationUnitIds.includes(variable.unit));
  const yAxisIsConcentration = plot.y_unit ? concentrationUnitIds.includes(plot.y_unit) : false;

  type SimulationYAxisWithIndex = SimulationYAxis & { index: number };
  const lhs_y_axes: SimulationYAxisWithIndex[] = y_axes.map((y, i) => ({...y, index: i })).filter((y) => !y.right);
  const rhs_y_axes: SimulationYAxisWithIndex[] = y_axes.map((y, i) => ({...y, index: i })).filter((y) => y.right);

  let baseYUnitId = lhs_y_axes.length > 0 ? variables.find(v => v.id === lhs_y_axes[0].variable)?.unit : undefined; 
  if (baseYUnitId === null) {
    baseYUnitId = undefined;
  }
  let baseY2UnitId = rhs_y_axes.length > 0 ? variables.find(v => v.id === rhs_y_axes[0].variable)?.unit : undefined;
  if (baseY2UnitId === null) {
    baseY2UnitId = undefined;
  }

  const commonAddYAxis = (variableId: number, first: boolean, right: boolean) => {
    const variable = variables.find(v => v.id === variableId);
    if (!variable) {
      return;
    }
    if (first) {
      if (right) {
        setValue(`plots.${index}.y_unit2`, variable.unit)
      } else {
        setValue(`plots.${index}.y_unit`, variable.unit)
      }
    }
    addYAxis({
      id: 0,
      variable: variable.id,
      right,
    });
  }

  const handleAddYAxis = (variableId: number) => {
    commonAddYAxis(variableId, lhs_y_axes.length === 0, false);
  }

  const handleAddY2Axis = (variableId: number) => {
    commonAddYAxis(variableId, rhs_y_axes.length === 0, true);
  }

  const handleRemoveYAxis = (yAxis: SimulationYAxisWithIndex) => {
    removeYAxis(yAxis.index);
  }

  const handleAddCxLine = (value: number) => {
    addCxLines({
      value,
      id: 0,
    });
  }

  const handleRemoveCxLine = (cxLineIndex: number) => {
    removeCxLines(cxLineIndex);
  }

  const getAddAxisOptions = (axes: SimulationYAxisWithIndex[]) => {
    // start with all variables that are not constants and are not already on the axis
    const varIdsOnAxes = axes.map(a => a.variable);
    let addAxisVars = variables.filter(v => !v.constant && !varIdsOnAxes.includes(v.id));

    // filter out any variables that have incompatible units with the first variable on the axis
    if (axes.length > 0) {
      const unitId = variables.find(v => v.id === axes[0].variable)?.unit;
      const unit = units?.find(u => u.id === unitId);
      if (unit) {
        const compatibleUnits = unit.compatible_units.map(u => parseInt(u.id))
        addAxisVars = addAxisVars.filter((v) => v.unit ? compatibleUnits.includes(v.unit) : true);
      }
    }
    return addAxisVars.map((v) => ({ label: v.name, value: v.id }));
  }

  const addY2AxisOptions = getAddAxisOptions(rhs_y_axes);
  const addYAxisOptions = getAddAxisOptions(lhs_y_axes);
  const addCxLineOptions = [10, 20, 50, 80, 90, 95, 99].map((v) => ({ label: v.toString(), value: v })); 
  let receptorOccupancyVariableOptions: { label: string, value: string | number}[] = concentrationVariables.map((v) => ({ label: v.name, value: v.id }));
  receptorOccupancyVariableOptions.push({ label: 'None', value: '' })
  const haveEfficacyExp = compound.efficacy_experiments.length > 0;
  

  const axisScaleOptions = [
    { label: 'Linear', value: 'lin' },
    { label: 'Log2', value: 'lg2' },
    { label: 'Log10', value: 'lg10' },
    { label: 'Ln', value: 'ln' },
  ];

  return (
    <Stack sx={{marginTop: 2}}>
    <Stack direction={'row'} spacing={2} alignItems={'center'}>
      <UnitField
        label="X Axis Unit"
        name={`plots.${index}.x_unit`}
        control={control}
        baseUnit={units.find(u => u.id === baseXUnitId)}
      />
      <SelectField label="X Axis Scale" name={`plots.${index}.x_scale`} options={axisScaleOptions} control={control} />
    </Stack>
    <Divider sx={{margin: 2}} />
    <Stack direction={'row'} spacing={2} alignItems={'center'}>
      <Typography variant='h6'>Y Axis</Typography>
      <UnitField
          label="Y Axis Unit"
          name={`plots.${index}.y_unit`}
          control={control}
          baseUnit={units.find(u => u.id === baseYUnitId)}
          selectProps={{disabled: lhs_y_axes.length === 0}}
      />
      <SelectField label="Y Axis Scale" name={`plots.${index}.y_scale`} options={axisScaleOptions} control={control} />
      <DropdownButton options={addYAxisOptions} onOptionSelected={handleAddYAxis}>
        <Add />
      </DropdownButton>
    </Stack>
    <List>
    {lhs_y_axes.map((yAxis, yAxisIndex) => (
        <ListItem key={yAxisIndex}>
        <Grid container spacing={2}>
            <Grid item xs={3}>
            <SelectField
                label="Variable"
                name={`plots.${index}.y_axes.${yAxis.index}.variable`}
                options={variables.filter((v) => !v.constant).map((v) => ({ value: v.id, label: v.name }))}
                control={control}
            />
            </Grid>
            <Grid item xs={2}>
            <IconButton onClick={() => handleRemoveYAxis(yAxis)}>
              <Delete />
            </IconButton>
            </Grid>
        </Grid>
        </ListItem>
    ))}
    </List>
    <Stack direction={'row'} spacing={2} alignItems={'center'}>
      <Typography variant='h6'>Cx Reference Lines</Typography>
      <DropdownButton options={addCxLineOptions} onOptionSelected={handleAddCxLine} disabled={!yAxisIsConcentration || !haveEfficacyExp} >
        <Add />
      </DropdownButton>
    </Stack>
    <List>
    {cx_lines.map((cxLine, cxLineIndex) => (
        <ListItem key={cxLineIndex}>
        <Grid container spacing={2}>
            <Grid item xs={3}>
            <TextField
                label="Cx"
                name={`plots.${index}.cx_lines.${cxLineIndex}.value`}
                control={control}
                textFieldProps={{ type: 'number', inputProps: {step: 0.1}, disabled: !yAxisIsConcentration }}
            />
            </Grid>
            <Grid item xs={2}>
            <IconButton onClick={() => handleRemoveCxLine(cxLineIndex)}>
              <Delete />
            </IconButton>
            </Grid>
        </Grid>
        </ListItem>
    ))}
    </List>
    <Divider sx={{margin: 2}} />
    <Stack direction={'row'} spacing={2} alignItems={'center'}>
      <Typography variant='h6'>Y2 Axis</Typography>
      <UnitField
          label="Unit"
          name={`plots.${index}.y_unit2`}
          control={control}
          baseUnit={units.find(u => u.id === baseY2UnitId)}
          selectProps={{disabled: rhs_y_axes.length === 0}}
      />
        <SelectField label="Y2 Axis Scale" name={`plots.${index}.y2_scale`} options={axisScaleOptions} control={control} />
      <DropdownButton options={addY2AxisOptions} onOptionSelected={handleAddY2Axis} >
        <Add />
      </DropdownButton>
    </Stack>
    <List>
    {rhs_y_axes.map((yAxis, yAxisIndex) => (
        <ListItem key={yAxisIndex}>
        <Grid container spacing={2}>
            <Grid item xs={7}>
            <SelectField
                label="Variable"
                name={`plots.${index}.y_axes.${yAxis.index}.variable`}
                options={variables.filter((v) => !v.constant).map((v) => ({ value: v.id, label: v.name }))}
                control={control}
            />
            </Grid>
            <Grid item xs={2}>
            <IconButton onClick={() => handleRemoveYAxis(yAxis)}>
              <Delete />
            </IconButton>
            </Grid>
        </Grid>
        </ListItem>
    ))}
    </List>
    </Stack>
  );
}

export default SimulationPlotForm;