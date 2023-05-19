import React, { useEffect, useState } from "react";
import { useForm, Controller, useFieldArray, set, useFormState } from "react-hook-form";
import { useSelector, useDispatch } from "react-redux";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Select,
  MenuItem,
  Stack,
  Radio,
  Checkbox as MuiCheckbox,
  FormControlLabel,
} from "@mui/material";
import { Delete, PersonAdd } from "@mui/icons-material";
import { api } from "../../app/api";
import { Compound, Project, ProjectAccess, useProjectDestroyMutation, useProjectListQuery, useCompoundRetrieveQuery, useCompoundUpdateMutation, useProjectUpdateMutation, PkpdMapping, useVariableRetrieveQuery, CombinedModel, Variable, useVariableUpdateMutation, Protocol, useProtocolCreateMutation, useProtocolDestroyMutation } from "../../app/backendApi";
import SelectField from "../../components/SelectField";
import { selectProject } from "../main/mainSlice";
import TextField from "../../components/TextField";
import Checkbox from "../../components/Checkbox";
import UnitField from "../../components/UnitField";

interface Props {
  project: Project;
  model: CombinedModel;
  variableId: number;
}


const ParameterRow: React.FC<Props> = ({ project, model, variableId }) => {

  const { data: variable, error, isLoading } = useVariableRetrieveQuery({id: variableId});
  const { control, handleSubmit, reset, setValue, getValues, formState: { isDirty: isDirtyForm }, watch} = useForm<Variable>(
    { defaultValues: variable || { id: 0, name: ''}}
  );
  const [updateVariable, { isLoading: isUpdatingVariable }] = useVariableUpdateMutation();

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

  const defaultProps = {
    fullWidth: true,
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
