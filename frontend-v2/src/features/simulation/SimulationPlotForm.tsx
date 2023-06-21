import React from 'react';
import { Control, UseFormSetValue, useFieldArray } from 'react-hook-form';
import { Simulation, SimulationPlot, SimulationYAxis, Variable, useUnitListQuery } from '../../app/backendApi';
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
}

const SimulationPlotForm: React.FC<SimulationPlotFormProps> = ({ index, plot, variables, control, setValue }) => {
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
  if (!units) {
    return <div>Failed to load units</div>
  }

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
  const addCxLineOptions = Array.from({ length: 6 }, (_, i) => 100 * i / 5).map((v) => ({ label: v.toString(), value: v })); 
  let receptorOccupancyVariableOptions: { label: string, value: string | number}[] = concentrationVariables.map((v) => ({ label: v.name, value: v.id }));
  receptorOccupancyVariableOptions.push({ label: 'None', value: '' })
  

  return (
    <Stack sx={{marginTop: 2}}>
    <Grid container spacing={4}>
        <Grid item xs={3}>
        <UnitField
            label="X Axis Unit"
            name={`plots.${index}.x_unit`}
            control={control}
            baseUnitId={baseXUnitId}
        />
        </Grid>
    </Grid>
    <Divider sx={{margin: 2}} />
    <Grid container spacing={1} alignItems={'center'}>
      <Grid item xs={2}>
        <Typography variant='h6'>Y Axis</Typography>
      </Grid>
      <Grid item xs={3}>
      <UnitField
          label="Y Axis Unit"
          name={`plots.${index}.y_unit`}
          control={control}
          baseUnitId={baseYUnitId}
          selectProps={{disabled: lhs_y_axes.length === 0}}
      />
      </Grid>
      <Grid item xs={2}>
      <DropdownButton options={addYAxisOptions} onOptionSelected={handleAddYAxis}>
        <Add />
      </DropdownButton>
      </Grid>
    </Grid>
    <List>
    {lhs_y_axes.map((yAxis, yAxisIndex) => (
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
    <Stack direction={'row'} spacing={1} alignItems={'center'}>
      <Typography variant='h6'>Cx Reference Lines</Typography>
      <DropdownButton options={addCxLineOptions} onOptionSelected={handleAddCxLine} disabled={!yAxisIsConcentration} >
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
    <Grid container spacing={1} alignItems={'center'}>
      <Grid item xs={2}>
        <Typography variant='h6'>Y2 Axis</Typography>
      </Grid>
      <Grid item xs={3}>
      <UnitField
          label="Unit"
          name={`plots.${index}.y_unit2`}
          control={control}
          baseUnitId={baseY2UnitId}
          selectProps={{disabled: rhs_y_axes.length === 0}}
      />
      </Grid>
      <Grid item xs={3}>
      <DropdownButton options={addY2AxisOptions} onOptionSelected={handleAddY2Axis} >
        <Add />
      </DropdownButton>
      </Grid>

    </Grid>

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