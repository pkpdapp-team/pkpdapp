// src/components/ProjectTable.tsx
import React, { useEffect, useState } from "react";
import { useForm, Controller, useFieldArray, set } from "react-hook-form";
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

interface Props {
  project: Project;
  model: CombinedModel;
  variableId: number;
  mappings: PkpdMapping[];
  appendMapping: (value: PkpdMapping) => void;
  removeMapping: (index: number) => void;
}


const VariableRow: React.FC<Props> = ({ project, model, variableId, appendMapping, removeMapping, mappings }) => {

  const { data: variable, error, isLoading } = useVariableRetrieveQuery({id: variableId});
  const { control, handleSubmit, reset, setValue, getValues, formState: { isDirty } } = useForm<Variable>();
  const [updateVariable, { isLoading: isUpdatingVariable }] = useVariableUpdateMutation();
  const [createProtocol, { isLoading: isCreatingProtocol }] = useProtocolCreateMutation();
  const [destroyProtocol, { isLoading: isDestroyingProtocol }] = useProtocolDestroyMutation();

  useEffect(() => {
    reset(variable);
  }, [variable, reset]);
  
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

  const defaultProps = {
    fullWidth: true,
  }

  const isPD = variable.pd_model ? true : false;
  const hasProtocol: boolean = variable.protocol ? true : false;
  const linkToPD = isPD ? false : mappings.find((mapping) => mapping.pd_variable === variable.id) != undefined;

  const addProtocol = () => {
    createProtocol({ protocol: { id: 0, dataset: '', doses: [], dose_ids: [], dosed_pk_models: [], subjects: [], name: variable.name, project: project.id } }).then((value) => 'data' in value && setValue("protocol", value.data.id ) );
  };

  const removeProtocol = () => {
    if (variable.protocol) {
      destroyProtocol({ id: variable.protocol }).then((value) => 'data' in value && setValue("protocol", null) );
    }
  };

  const addPDMapping = () => {
    appendMapping({ id: 0, pk_variable: variable.id, pd_variable: 0, pkpd_model: model.id, datetime: '', read_only: false });
  };

  const removePDMapping = () => {
    const mapping_index = mappings.findIndex((mapping) => mapping.pk_variable === variable.id);
    if (mapping_index >= 0) {
      removeMapping(mapping_index);
    }
  };


  return (
    <TableRow>
      <TableCell>
        {variable.name}
      </TableCell>
      <TableCell>
        {isPD ? "PD" : "PK"}
      </TableCell>
      <TableCell>
        <FormControlLabel control={<MuiCheckbox checked={hasProtocol} onClick={() => hasProtocol ? addProtocol() : removeProtocol()} />} label="Dosing" />
      </TableCell>
      <TableCell>
        <FormControlLabel control={<MuiCheckbox checked={linkToPD} onClick={() => linkToPD ? addPDMapping() : removePDMapping()} />} label="Map to PD Effect" />
      </TableCell>
      <TableCell>
        <Checkbox name="link_to_ro" control={control} label="Link to RO" />
      </TableCell>
    </TableRow>
  );
}

export default VariableRow;
