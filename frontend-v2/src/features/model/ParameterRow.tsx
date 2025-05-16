import { FC, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { TableCell, TableRow, Tooltip, Typography } from "@mui/material";
import {
  Variable,
  useVariableUpdateMutation,
  ProjectRead,
  UnitRead,
  VariableRead,
} from "../../app/backendApi";
import UnitField from "../../components/UnitField";
import useDirty from "../../hooks/useDirty";
import FloatField from "../../components/FloatField";
import { selectIsProjectShared } from "../login/loginSlice";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";

interface Props {
  project: ProjectRead;
  variable: VariableRead;
  units: UnitRead[];
}

const ParameterRow: FC<Props> = ({ project, variable, units }) => {
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
    </TableRow>
  );
};

export default ParameterRow;
