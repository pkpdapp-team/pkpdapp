import { FC } from "react";
import {
  Control,
  FieldArrayWithId,
  UseFormSetValue,
  useFieldArray,
} from "react-hook-form";
import {
  CompoundRead,
  Simulation,
  UnitRead,
  VariableRead,
  useProjectRetrieveQuery,
} from "../../app/backendApi";
import {
  Divider,
  Grid,
  IconButton,
  List,
  ListItem,
  Stack,
  Typography,
} from "@mui/material";
import TextField from "../../components/TextField";
import UnitField from "../../components/UnitField";
import SelectField from "../../components/SelectField";
import DropdownButton from "../../components/DropdownButton";
import Delete from "@mui/icons-material/Delete";
import FloatField from "../../components/FloatField";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { selectIsProjectShared } from "../login/loginSlice";
import { getDefaultAxisTitles, getYAxisOptions } from "./utils";

interface SimulationPlotFormProps {
  index: number;
  plot: FieldArrayWithId<Simulation, "plots", "id">;
  variables: VariableRead[];
  control: Control<Simulation>;
  setValue: UseFormSetValue<Simulation>;
  units: UnitRead[];
  compound: CompoundRead;
}

const SimulationPlotForm: FC<SimulationPlotFormProps> = ({
  index,
  plot,
  variables,
  control,
  setValue,
  units,
  compound,
}) => {
  const projectId = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const { data: project } = useProjectRetrieveQuery(
    { id: projectId || 0 },
    { skip: !projectId },
  );
  const isSharedWithMe = useSelector((state: RootState) =>
    selectIsProjectShared(state, project),
  );

  const baseXUnitId = units
    ? units.find((u) => u.symbol === "h")?.id
    : undefined;

  const {
    fields: y_axes,
    append: addYAxis,
    remove: removeYAxis,
  } = useFieldArray({
    control,
    name: `plots.${index}.y_axes`,
  });

  const {
    fields: cx_lines,
    append: addCxLines,
    remove: removeCxLines,
  } = useFieldArray({
    control,
    name: `plots.${index}.cx_lines`,
  });

  const concentrationUnit = units.find((unit) => unit.symbol === "pmol/L");
  if (concentrationUnit === undefined) {
    return <>No concentration or amount unit found</>;
  }
  const concentrationUnitIds = concentrationUnit.compatible_units.map((unit) =>
    parseInt(unit.id),
  );
  const concentrationVariables = variables.filter(
    (variable) => variable.unit && concentrationUnitIds.includes(variable.unit),
  );
  const yAxisIsConcentration = plot.y_unit
    ? concentrationUnitIds.includes(plot.y_unit)
    : false;

  const isComplexAmount = (variable: VariableRead | undefined) => {
    if (!variable) {
      return false;
    }
    if (!variable.name.startsWith("A")) {
      return false;
    }
    const hasT1 = variable.name.includes("T1");
    const hasT2 = variable.name.includes("T2");
    const hasD = variable.name.includes("D");
    // complex if have 2 or more of T1, T2, D
    const count = (hasT1 ? 1 : 0) + (hasT2 ? 1 : 0) + (hasD ? 1 : 0);
    return count >= 2;
  };

  type SimulationYAxisWithIndex = FieldArrayWithId<
    Simulation,
    `plots.${number}.y_axes`,
    "id"
  > & { index: number };
  const lhs_y_axes: SimulationYAxisWithIndex[] = y_axes
    .map((y, i) => ({ ...y, index: i }))
    .filter((y) => !y.right);
  const rhs_y_axes: SimulationYAxisWithIndex[] = y_axes
    .map((y, i) => ({ ...y, index: i }))
    .filter((y) => y.right);

  let baseYUnitId =
    lhs_y_axes.length > 0
      ? variables.find((v) => v.id === lhs_y_axes[0].variable)?.unit
      : undefined;
  if (baseYUnitId === null) {
    baseYUnitId = undefined;
  }
  let baseY2UnitId =
    rhs_y_axes.length > 0
      ? variables.find((v) => v.id === rhs_y_axes[0].variable)?.unit
      : undefined;
  if (baseY2UnitId === null) {
    baseY2UnitId = undefined;
  }

  const yAxisVariables = lhs_y_axes.map((y) =>
    variables.find((v) => v.id === y.variable),
  );
  const yAxisVariableNames = yAxisVariables.map((v) => v?.name || "");
  const yAxisIsComplexAmount = yAxisVariables.some((v) => isComplexAmount(v));

  const y2AxisVariables = rhs_y_axes.map((y) =>
    variables.find((v) => v.id === y.variable),
  );
  const y2AxisVariableNames = y2AxisVariables.map((v) => v?.name || "");
  const y2AxisIsComplexAmount = y2AxisVariables.some((v) => isComplexAmount(v));

  const { xAxisTitle, yAxisTitle, y2AxisTitle } = getDefaultAxisTitles({
    plot,
    units,
    yAxisVariableNames,
    y2AxisVariableNames,
  });

  const commonAddYAxis = (
    variableId: number,
    first: boolean,
    right: boolean,
  ) => {
    const variable = variables.find((v) => v.id === variableId);
    if (!variable) {
      return;
    }
    const { unit: defaultUnit, scale: defaultScale } = getYAxisOptions(
      compound,
      variable,
      units,
    );
    if (first) {
      if (right) {
        setValue(`plots.${index}.y_unit2`, defaultUnit);
        setValue(`plots.${index}.y2_scale`, defaultScale);
      } else {
        setValue(`plots.${index}.y_unit`, defaultUnit);
        setValue(`plots.${index}.y_scale`, defaultScale);
      }
    }
    addYAxis({
      variable: variable.id,
      right,
    });
  };

  const handleAddYAxis = (variableId: number) => {
    commonAddYAxis(variableId, lhs_y_axes.length === 0, false);
  };

  const handleAddY2Axis = (variableId: number) => {
    commonAddYAxis(variableId, rhs_y_axes.length === 0, true);
  };

  const handleRemoveYAxis = (yAxis: SimulationYAxisWithIndex) => {
    removeYAxis(yAxis.index);
  };

  const handleAddCxLine = (value: number) => {
    addCxLines({
      value,
    });
  };

  const handleRemoveCxLine = (cxLineIndex: number) => {
    removeCxLines(cxLineIndex);
  };

  const getAddAxisOptions = (axes: SimulationYAxisWithIndex[]) => {
    // start with all variables that are not constants and are not already on the axis
    const varIdsOnAxes = axes.map((a) => a.variable);
    let addAxisVars = variables.filter(
      (v) => !v.constant && !varIdsOnAxes.includes(v.id),
    );

    // filter out any variables that have incompatible units with the first variable on the axis
    if (axes.length > 0) {
      const unitId = variables.find((v) => v.id === axes[0].variable)?.unit;
      const unit = units?.find((u) => u.id === unitId);
      if (unit) {
        const compatibleUnits = unit.compatible_units.map((u) =>
          parseInt(u.id),
        );
        addAxisVars = addAxisVars.filter((v) =>
          v.unit ? compatibleUnits.includes(v.unit) : true,
        );
      }
    }
    return addAxisVars.map((v) => ({ label: v.name, value: v.id }));
  };

  const addY2AxisOptions = getAddAxisOptions(rhs_y_axes);
  const addYAxisOptions = getAddAxisOptions(lhs_y_axes);
  const addCxLineOptions = [10, 20, 50, 80, 90, 95, 99].map((v) => ({
    label: v.toString(),
    value: v,
  }));
  const receptorOccupancyVariableOptions: {
    label: string;
    value: string | number;
  }[] = concentrationVariables.map((v) => ({ label: v.name, value: v.id }));
  receptorOccupancyVariableOptions.push({ label: "None", value: "" });
  const haveEfficacyExp = compound.efficacy_experiments.length > 0;

  const axisScaleOptions = [
    { label: "Linear", value: "lin" },
    //{ label: 'Log2', value: 'lg2' },
    { label: "Log10", value: "lg10" },
    //{ label: 'Ln', value: 'ln' },
  ];

  const defaultProps = {
    disabled: isSharedWithMe,
  };
  const axisLabelProps = {
    ...defaultProps,
    type: "search",
  };

  return (
    <Stack>
      <Typography sx={{ fontWeight: "bold", paddingBottom: "1rem" }}>
        X Axis
      </Typography>
      <Stack direction={"row"} spacing={2} alignItems={"center"}>
        <UnitField
          label="X Axis Unit"
          name={`plots.${index}.x_unit`}
          control={control}
          baseUnit={units.find((u) => u.id === baseXUnitId)}
          selectProps={defaultProps}
        />
        <TextField
          label="X Axis Label"
          name={`plots.${index}.x_label`}
          control={control}
          textFieldProps={axisLabelProps}
          defaultValue={xAxisTitle}
        />
        <SelectField
          label="X Axis Scale"
          name={`plots.${index}.x_scale`}
          options={axisScaleOptions}
          control={control}
          selectProps={defaultProps}
        />
      </Stack>
      <Divider sx={{ margin: 2 }} />
      <Typography sx={{ fontWeight: "bold", paddingBottom: "1rem" }}>
        Y Axis
      </Typography>
      <DropdownButton
        useIcon={false}
        data_cy="add-y-axis"
        options={addYAxisOptions}
        onOptionSelected={handleAddYAxis}
        disabled={isSharedWithMe}
      >
        Add Y axis
      </DropdownButton>
      <Stack
        direction={"row"}
        spacing={2}
        alignItems={"center"}
        sx={{ paddingTop: "1.5rem" }}
      >
        <UnitField
          label="Y Axis Unit"
          name={`plots.${index}.y_unit`}
          control={control}
          baseUnit={units.find((u) => u.id === baseYUnitId)}
          selectProps={{ disabled: lhs_y_axes.length === 0 || isSharedWithMe }}
          mustHaveMol={yAxisIsComplexAmount}
        />
        <TextField
          label="Y Axis Label"
          name={`plots.${index}.y_label`}
          control={control}
          textFieldProps={axisLabelProps}
          defaultValue={yAxisTitle}
        />
        <SelectField
          label="Y Axis Scale"
          name={`plots.${index}.y_scale`}
          options={axisScaleOptions}
          control={control}
          selectProps={defaultProps}
        />
        <FloatField
          label="Y Axis Min"
          name={`plots.${index}.min`}
          control={control}
          textFieldProps={defaultProps}
        />
        <FloatField
          label="Y Axis Max"
          name={`plots.${index}.max`}
          control={control}
          textFieldProps={defaultProps}
        />
      </Stack>
      <List>
        {lhs_y_axes.map((yAxis) => (
          <ListItem key={yAxis.id}>
            <Grid container spacing={2}>
              <Grid size={3}>
                <SelectField
                  label="Variable"
                  name={`plots.${index}.y_axes.${yAxis.index}.variable`}
                  options={variables
                    .filter((v) => !v.constant)
                    .map((v) => ({ value: v.id, label: v.name }))}
                  control={control}
                  selectProps={defaultProps}
                />
              </Grid>
              <Grid size={2}>
                <IconButton
                  onClick={() => handleRemoveYAxis(yAxis)}
                  disabled={isSharedWithMe}
                >
                  <Delete titleAccess="Delete" />
                </IconButton>
              </Grid>
            </Grid>
          </ListItem>
        ))}
      </List>
      <Divider sx={{ margin: 2 }} />
      <Stack direction={"row"} spacing={2} alignItems={"center"}>
        <Typography sx={{ fontWeight: "bold", paddingBottom: "1rem" }}>
          Reference lines (if Efficacy-Safety Data have been defined in Drug and
          Target)
        </Typography>
      </Stack>
      <DropdownButton
        useIcon={false}
        data_cy="add-cx-lines"
        options={addCxLineOptions}
        onOptionSelected={handleAddCxLine}
        disabled={!yAxisIsConcentration || !haveEfficacyExp || isSharedWithMe}
      >
        Add Lines
      </DropdownButton>
      <List>
        {cx_lines.map((cxLine, cxLineIndex) => (
          <ListItem key={cxLine.id}>
            <Grid container spacing={2}>
              <Grid size={3}>
                <TextField
                  label="Cx"
                  name={`plots.${index}.cx_lines.${cxLineIndex}.value`}
                  control={control}
                  textFieldProps={{
                    type: "number",
                    inputProps: { step: 0.1 },
                    disabled: !yAxisIsConcentration || isSharedWithMe,
                  }}
                />
              </Grid>
              <Grid size={2}>
                <IconButton
                  onClick={() => handleRemoveCxLine(cxLineIndex)}
                  disabled={isSharedWithMe}
                >
                  <Delete titleAccess="Delete" />
                </IconButton>
              </Grid>
            </Grid>
          </ListItem>
        ))}
      </List>
      <Divider sx={{ margin: 2 }} />
      <Typography sx={{ fontWeight: "bold", paddingBottom: "1rem" }}>
        Y2 Axis
      </Typography>
      <DropdownButton
        useIcon={false}
        data_cy="add-variable"
        options={addY2AxisOptions}
        onOptionSelected={handleAddY2Axis}
        disabled={isSharedWithMe}
      >
        Add Variable
      </DropdownButton>
      <Stack
        direction={"row"}
        spacing={2}
        alignItems={"center"}
        sx={{ paddingTop: "1rem" }}
      >
        <UnitField
          label="Unit"
          name={`plots.${index}.y_unit2`}
          control={control}
          baseUnit={units.find((u) => u.id === baseY2UnitId)}
          selectProps={{ disabled: rhs_y_axes.length === 0 || isSharedWithMe }}
          mustHaveMol={y2AxisIsComplexAmount}
        />
        <TextField
          label="Y2 Axis Label"
          name={`plots.${index}.y2_label`}
          control={control}
          textFieldProps={axisLabelProps}
          defaultValue={y2AxisTitle}
        />
        <SelectField
          label="Y2 Axis Scale"
          name={`plots.${index}.y2_scale`}
          options={axisScaleOptions}
          control={control}
          selectProps={defaultProps}
        />
        <FloatField
          label="Y2 Axis Min"
          name={`plots.${index}.min2`}
          control={control}
          textFieldProps={defaultProps}
        />
        <FloatField
          label="Y2 Axis Max"
          name={`plots.${index}.max2`}
          control={control}
          textFieldProps={defaultProps}
        />
      </Stack>
      <List>
        {rhs_y_axes.map((yAxis) => (
          <ListItem key={yAxis.id}>
            <Grid container spacing={2}>
              <Grid size={7}>
                <SelectField
                  label="Variable"
                  name={`plots.${index}.y_axes.${yAxis.index}.variable`}
                  options={variables
                    .filter((v) => !v.constant)
                    .map((v) => ({ value: v.id, label: v.name }))}
                  control={control}
                  selectProps={defaultProps}
                />
              </Grid>
              <Grid size={2}>
                <IconButton
                  onClick={() => handleRemoveYAxis(yAxis)}
                  disabled={isSharedWithMe}
                >
                  <Delete titleAccess="Delete" />
                </IconButton>
              </Grid>
            </Grid>
          </ListItem>
        ))}
      </List>
    </Stack>
  );
};

export default SimulationPlotForm;
