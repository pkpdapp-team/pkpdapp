import { FC, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { TableCell, TableRow, Tooltip, Typography } from "@mui/material";
import {
  Variable,
  useVariableUpdateMutation,
  CombinedModelRead,
  ProjectRead,
  UnitRead,
  VariableRead,
} from "../../app/backendApi";
import UnitField from "../../components/UnitField";
import useDirty from "../../hooks/useDirty";
import useInterval from "../../hooks/useInterval";
import FloatField from "../../components/FloatField";
import { selectIsProjectShared } from "../login/loginSlice";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";

interface Props {
  project: ProjectRead;
  model: CombinedModelRead;
  variable: VariableRead;
  units: UnitRead[];
}

const ParameterRow: FC<Props> = ({ project, model, variable, units }) => {
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

  return (
    <TableRow>
      <TableCell>
        <Tooltip title={variable.description}>
          <Typography>{variable.name}</Typography>
        </Tooltip>
      </TableCell>
      <TableCell>{type}</TableCell>
      <TableCell>
        <FloatField
          name="lower_bound"
          control={control}
          label="Lower"
          textFieldProps={defaultProps}
        />
      </TableCell>
      <TableCell>
        <FloatField
          name="default_value"
          control={control}
          label="Value"
          rules={{ required: true }}
          data_cy={`parameter-${variable.name}-value`}
          textFieldProps={defaultProps}
        />
      </TableCell>
      <TableCell>
        <FloatField
          name="upper_bound"
          control={control}
          label="Upper"
          textFieldProps={defaultProps}
        />
      </TableCell>
      <TableCell>
        <UnitField
          label={"Unit"}
          name={"unit"}
          control={control}
          baseUnit={unit}
          isPreclinicalPerKg={isPreclinicalPerKg}
          selectProps={defaultProps}
        />
      </TableCell>
    </TableRow>
  );
};

export default ParameterRow;
