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
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import { Delete, PersonAdd } from "@mui/icons-material";
import { api } from "../../app/api";
import { Compound, Project, ProjectAccess, useProjectDestroyMutation, useProjectListQuery, useCompoundRetrieveQuery, useCompoundUpdateMutation, useProjectUpdateMutation, PkpdMapping, useVariableRetrieveQuery, CombinedModel } from "../../app/backendApi";
import SelectField from "../../components/SelectField";
import { selectProject } from "../main/mainSlice";
import TextField from "../../components/TextField";

interface Props {
  project: Project;
  model: CombinedModel;
  variableId: number;
  mappings: PkpdMapping[];
  appendMapping: (value: PkpdMapping) => void;
  removeMapping: (index: number) => void;
}

export interface FormData {
  project: Project;
  compound: Compound;
}

const ProjectRow: React.FC<Props> = ({ project, model, variableId, appendMapping, removeMapping, mappings }) => {

  const { data: variable, error, isLoading } = useVariableRetrieveQuery({id: variableId});

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

  return (
    <TableRow>
      <TableCell>
        {variable.name}
      </TableCell>
      <TableCell>
        {isPD ? "PD" : "PK"}
      </TableCell>
      <TableCell>
        <FormControlLabel control={<Checkbox checked={hasProtocol} onClick={() => hasProtocol ? addProtocol() : removeProtocol()} />} label="Dosing" />
      </TableCell>
      <TableCell>
        <FormControlLabel control={<Checkbox checked={linkToPD} onClick={() => linkToPD ? addPDMapping() : removePDMapping()} />} label="Map to PD Effect" />
      </TableCell>
      <TableCell>
        <SelectField options={modalityOptions} name="compound.compound_type" control={control} selectProps={defaultProps}/> 
      </TableCell>
    </TableRow>
  );
};

export default ProjectRow;
