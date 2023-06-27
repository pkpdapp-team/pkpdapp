import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  TableCell,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { Project, CombinedModel, Variable, useVariableUpdateMutation } from "../../app/backendApi";
import TextField from "../../components/TextField";
import UnitField from "../../components/UnitField";
import useDirty from "../../hooks/useDirty";
import FloatField from "../../components/FloatField";

interface Props {
  project: Project;
  model: CombinedModel;
  variable: Variable;
}


const ParameterRow: React.FC<Props> = ({ project, model, variable }) => {

  const { control, handleSubmit, reset, formState: { isDirty: isDirtyForm }} = useForm<Variable>(
    { defaultValues: variable || { id: 0, name: ''}}
  );
  const [updateVariable] = useVariableUpdateMutation();

  useEffect(() => {
    reset(variable);
  }, [variable, reset]);

  const isDirty = isDirtyForm;
  useDirty(isDirty)

  const submit = handleSubmit((data) => {
    if (JSON.stringify(data) !== JSON.stringify(variable)) {
      updateVariable({ id: data.id, variable: data })
    }
  })

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (isDirty) {
        submit();
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, [submit, isDirty]);

  useEffect(() => () => { submit(); }, []);
 
  if (variable.constant !== true) {
    return (null);
  }


  const isPD = variable.qname.startsWith("PD");

  return (
    <TableRow>
      <TableCell>
        <Tooltip title={variable.description}>
          <Typography>
            {variable.name}
          </Typography>
        </Tooltip>
      </TableCell>
      <TableCell>
        {isPD ? "PD" : "PK"}
      </TableCell>
      <TableCell>
        <FloatField name="default_value" control={control} label="Value" rules={{ required: true }} />
      </TableCell>
      <TableCell>
        <UnitField label={'Unit'} name={'unit'} control={control} baseUnitId={variable.unit === null ? undefined : variable.unit} />
      </TableCell>
    </TableRow>
  );
}

export default ParameterRow;
