import { FC, ReactNode, useEffect, useMemo } from "react";
import { FormData } from "./Model";
import { Control, useFieldArray, useForm } from "react-hook-form";
import { TableCell, TableRow, Tooltip, Typography, Select, SelectChangeEvent, MenuItem } from "@mui/material";
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
import FloatField from "../../components/FloatField";
import { selectIsProjectShared } from "../login/loginSlice";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { derivedIndex, DerivedVariableType } from "./derivedVariable";


interface Props {
  model: CombinedModelRead;
  project: ProjectRead;
  variable: VariableRead;
  units: UnitRead[];
  modelControl: Control<FormData>;
}

const ParameterRow: FC<Props> = ({ model, project, variable, units, modelControl }) => {
  const {
    control,
    handleSubmit,
    formState: { isDirty, submitCount },
  } = useForm<Variable>({
    defaultValues: variable || { id: 0, name: "" },
    values: variable,
  });
  const [updateVariable] = useVariableUpdateMutation();
  useDirty(isDirty);

  const isSharedWithMe = useSelector((state: RootState) =>
    selectIsProjectShared(state, project),
  );

  const {
    fields: derivedVariables,
    append: derivedVariablesAppend,
    remove: derivedVariablesRemove,
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

  useEffect(() => {
    if (isDirty && submitCount === 0) {
      submit();
    }
  }, [isDirty, submitCount, submit]);

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
    { value: "MM", label: "Concentration-Dependent Michaelis-Menten" },
    { value: "EMM", label: "Concentration-Dependent Extended Michaelis-Menten" },
    { value: "EMX", label: "Dose-Dependent Maximum Effect" },
    { value: "IMX", label: "Dose-Dependent Maximum Inhibitory Effect" },
    { value: "POW", label: "Dose-Dependent Hill Effect" },
    { value: "TDI", label: "Time-Dependent Inhibition" },
    { value: "IND", label: "Time-Dependent Induction" },
    { value: "", label: "None" },
  ];

  let nonlinearityValue = "";
  for (let i = 0; i < derivedVariables.length; i++) {
    if (derivedVariables[i].pk_variable === variable.id) {
      nonlinearityValue = derivedVariables[i].type;
    }
  }

  const handleNonlinearityChange = (event: SelectChangeEvent<string>, child: ReactNode) => {
    // remove any other nonlinearity for this variable
    derivedVariables
      .forEach((ro, index) => {
        if (ro.pk_variable === variable.id) {
          derivedVariablesRemove(index);
        }
      });

    if (event.target.value !== "") {
      const value = event.target.value as DerivedVariableType;
      // add new nonlinearity
      derivedVariablesAppend({
        pk_variable: variable.id,
        pkpd_model: model.id,
        type: value,
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
        <Select size="small" value={nonlinearityValue} onChange={handleNonlinearityChange} {...defaultProps}>
          {nonlinearityOptions.map((option) => (
            <MenuItem value={option.value} key={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </TableCell>
    </TableRow>
  );
};

export default ParameterRow;
