import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  TableCell,
  TableRow,
} from "@mui/material";
import { Project, useVariableRetrieveQuery, CombinedModel, Variable, useVariableUpdateMutation } from "../../app/backendApi";
import TextField from "../../components/TextField";
import UnitField from "../../components/UnitField";

interface Props {
  project: Project;
  model: CombinedModel;
  variableId: number;
}


const ParameterRow: React.FC<Props> = ({ variableId }) => {

  const { data: variable, isLoading } = useVariableRetrieveQuery({id: variableId});
  const { control, handleSubmit, reset, formState: { isDirty: isDirtyForm }} = useForm<Variable>(
    { defaultValues: variable || { id: 0, name: ''}}
  );
  const [updateVariable] = useVariableUpdateMutation();

  useEffect(() => {
    reset(variable);
  }, [variable, reset]);

  const isDirty = isDirtyForm;

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (isDirty) {
        handleSubmit((data) => updateVariable({ id: data.id, variable: data }))();
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, [handleSubmit, isDirty, updateVariable]);
 
  if (isLoading) {
    return <div>Loading...</div>;
  }
  if (!variable) {
    return <div>Variable not found</div>;
  }

  if (variable.constant !== true) {
    return (null);
  }


  const isPD = variable.qname.startsWith("PD");

  return (
    <TableRow>
      <TableCell>
        {variable.name}
      </TableCell>
      <TableCell>
        {isPD ? "PD" : "PK"}
      </TableCell>
      <TableCell>
        <TextField name="default_value" control={control} label="Value" />
      </TableCell>
      <TableCell>
        <UnitField label={'Unit'} name={'unit'} control={control} baseUnitId={variable.unit === null ? undefined : variable.unit} />
      </TableCell>
    </TableRow>
  );
}

export default ParameterRow;
