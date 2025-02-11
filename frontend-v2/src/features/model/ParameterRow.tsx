import { FC, ReactNode, useEffect, useMemo } from "react";
import { FormData } from "./Model";
import { Control, useFieldArray, useForm } from "react-hook-form";
import { TableCell, TableRow, Tooltip, Typography, Select, SelectChangeEvent, MenuItem, Stack } from "@mui/material";
import {
  Variable,
  useVariableUpdateMutation,
  ProjectRead,
  UnitRead,
  VariableRead,
  CombinedModelRead,
} from "../../app/backendApi";
import UnitField from "../../components/UnitField";
import useDirty from "../../hooks/useDirty";
import useInterval from "../../hooks/useInterval";
import FloatField from "../../components/FloatField";
import { selectIsProjectShared } from "../login/loginSlice";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { derivedIndex, DerivedVariableType } from "./derivedVariable";


interface Props {
  model: CombinedModelRead;
  project: ProjectRead;
  variable: VariableRead;
  variables: VariableRead[];
  units: UnitRead[];
  modelControl: Control<FormData>;
}

const ParameterRow: FC<Props> = ({ model, project, variable, variables, units, modelControl }) => {
  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty: isDirtyForm },
  } = useForm<Variable>({ defaultValues: variable || { id: 0, name: "" } });
  const [updateVariable] = useVariableUpdateMutation();

  useEffect(() => {
    reset(variable);
  }, [variable, reset]);

  const isDirty = isDirtyForm;
  useDirty(isDirty);

  const isSharedWithMe = useSelector((state: RootState) =>
    selectIsProjectShared(state, project),
  );

  const {
    fields: derivedVariables,
    append: derivedVariablesAppend,
    remove: derivedVariablesRemove,
    update: derivedVariablesUpdate,
  } = useFieldArray({
    control: modelControl,
    name: "model.derived_variables",
  });

  const submit = useMemo(
    () =>
      handleSubmit((data) => {
        if (JSON.stringify(data) !== JSON.stringify(variable)) {
          updateVariable({ id: variable.id, variable: data });
        }
      }),
    [handleSubmit, updateVariable, variable],
  );

  useInterval({
    callback: submit,
    delay: 1000,
    isDirty,
  });

  if (variable.constant !== true) {
    return null;
  }

  const isPD = variable.qname.startsWith("PD");
  const isUD = variable.qname.endsWith("_ud");
  const type = isUD ? "UD" : isPD ? "PD" : "PK";

  const unit =
    variable.unit === null
      ? undefined
      : units.find((u) => u.id === variable.unit);
  const isPreclinicalPerKg =
    project?.species !== "H" && unit?.symbol.endsWith("/kg");

  const defaultProps = {
    disabled: isSharedWithMe,
  };

  const nonlinearityOptions: { value: DerivedVariableType | "", label: string }[] = [
    { value: "MM", label: "Michaelis-Menten" },
    { value: "EMM", label: "Extended Michaelis-Menten" },
    { value: "EMX", label: "Dose Maximum Effect" },
    { value: "IMX", label: "Dose Maximum Inhibitory Effect" },
    { value: "POW", label: "Dose Hill Effect" },
    { value: "TDI", label: "Time Inhibition" },
    { value: "IND", label: "Time Induction" },
    { value: "", label: "None" },
  ];

  let nonlinearityValue = "";
  let nonlinearityIndex = -1;
  let nonlinearityConcentration: null | undefined | number = null;
  for (let i = 0; i < derivedVariables.length; i++) {
    if (derivedVariables[i].pk_variable === variable.id) {
      if (derivedVariables[i].type === "MM" || derivedVariables[i].type === "EMM") {
        nonlinearityConcentration = derivedVariables[i].secondary_variable;
      }
      nonlinearityValue = derivedVariables[i].type;
      nonlinearityIndex = i;
    }
  }
  const timeVaryingVariables = variables.filter(
    (variable) => !variable.constant,
  );
  const concentrationOptions = timeVaryingVariables.map((variable) => ({
    value: variable.id,
    label: variable.name,
  }));
  // variable C1 is the default concentration variable
  const concentrationDefault = timeVaryingVariables.find(
    (variable) => variable.name === "C1",
  )?.id;

  const handleNonlinearityChange = (event: SelectChangeEvent<string>, child: ReactNode) => {
    // if current nonlinearity is empty, add new nonlinearity
    if (nonlinearityIndex === -1 && event.target.value !== "") {
      const value = event.target.value as DerivedVariableType;
      derivedVariablesAppend({
        pk_variable: variable.id,
        pkpd_model: model.id,
        type: value,
      });
      return;
    } else if (event.target.value === "") {
      // remove current nonlinearity
      derivedVariablesRemove(nonlinearityIndex);
    } else if (event.target.value === "MM" || event.target.value === "EMM") {
      // update the nonlinearity
      const value = event.target.value as DerivedVariableType;
      derivedVariablesUpdate(nonlinearityIndex, {
        pk_variable: variable.id,
        pkpd_model: model.id,
        type: value,
        secondary_variable: concentrationDefault,
      });
    } else {
      // update the nonlinearity
      const value = event.target.value as DerivedVariableType;
      derivedVariablesUpdate(nonlinearityIndex, {
        pk_variable: variable.id,
        pkpd_model: model.id,
        type: value,
      });
    }
  }

  const handleNonlinearityConcChange = (event: SelectChangeEvent<number>, child: ReactNode) => {
    // update the secondary variable for the nonlinearity
    if (event.target.value) {
      const value = typeof event.target.value === "string" ? parseInt(event.target.value) : event.target.value;
      derivedVariablesUpdate(nonlinearityIndex, {
        pk_variable: variable.id,
        pkpd_model: model.id,
        type: nonlinearityValue as DerivedVariableType,
        secondary_variable: value,
      });
    }
  }

  return (
    <TableRow>
      <TableCell size="small" sx={{ width: "5rem" }}>
        <Tooltip title={variable.description}>
          <Typography>{variable.name}</Typography>
        </Tooltip>
      </TableCell>
      <TableCell size="small" sx={{ width: "5rem" }}>
        {type}
      </TableCell>
      <TableCell size="small" sx={{ width: "10rem" }}>
        <FloatField
          sx={{ minWidth: "5rem" }}
          size="small"
          name="lower_bound"
          control={control}
          label="Lower"
          textFieldProps={defaultProps}
        />
      </TableCell>
      <TableCell size="small" sx={{ width: "10rem" }}>
        <FloatField
          sx={{ minWidth: "5rem" }}
          size="small"
          name="default_value"
          control={control}
          label="Value"
          rules={{ required: true }}
          data_cy={`parameter-${variable.name}-value`}
          textFieldProps={defaultProps}
        />
      </TableCell>
      <TableCell size="small" sx={{ width: "10rem" }}>
        <FloatField
          sx={{ minWidth: "5rem" }}
          size="small"
          name="upper_bound"
          control={control}
          label="Upper"
          textFieldProps={defaultProps}
        />
      </TableCell>
      <TableCell size="small">
        <UnitField
          size="small"
          sx={{ minWidth: "8rem" }}
          label={"Unit"}
          name={"unit"}
          control={control}
          baseUnit={unit}
          isPreclinicalPerKg={isPreclinicalPerKg}
          selectProps={defaultProps}
        />
      </TableCell>
      <TableCell size="small">
        <Stack direction="row" spacing={2}>
          <Select size="small" value={nonlinearityValue} onChange={handleNonlinearityChange} {...defaultProps}>
            {nonlinearityOptions.map((option) => (
              <MenuItem value={option.value} key={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
          {nonlinearityConcentration && (
            <Select size="small" value={nonlinearityConcentration} onChange={handleNonlinearityConcChange} {...defaultProps}>
              {concentrationOptions.map((option) => (
                <MenuItem value={option.value} key={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          )}
        </Stack>
      </TableCell>
    </TableRow>
  );
};

export default ParameterRow;
