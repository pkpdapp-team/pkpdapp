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
} from "@mui/material";
import TextField from "../../components/TextField";
import { Delete, PersonAdd, Save } from "@mui/icons-material";
import { api } from "../../app/api";
import { Compound, Project, ProjectAccess, useDestroyProjectMutation, useListProjectsQuery, useRetrieveCompoundQuery, useUpdateCompoundMutation, useUpdateProjectMutation } from "../../app/backendApi";
import SelectField from "../../components/SelectField";
import UserAccess from "./UserAccess";

interface Props {
  project: Project;
}

export interface FormData {
  project: Project;
  compound: Compound;
}

const ProjectRow: React.FC<Props> = ({ project }) => {
  const [
    updateProject, // This is the mutation trigger
    { isLoading: isUpdatingProject }, // This is the destructured mutation result
  ] = useUpdateProjectMutation()
  
   const [
    updateCompound, // This is the mutation trigger
    { isLoading: isUpdatingCompound }, // This is the destructured mutation result
  ] = useUpdateCompoundMutation()


  const [
    destroyProject, // This is the mutation trigger
    { isLoading: isDestroying }, // This is the destructured mutation result
  ] = useDestroyProjectMutation()
  
  const modalityOptions = [
    { value: "SM", label: "Small Molecule" },
    { value: "LM", label: "Large Molecule" },
  ]


  const { data: compound, error, isLoading } = useRetrieveCompoundQuery({id: `${project.compound}`})
  const defaultCompound: Compound = {id: 1, name: '', description: '', compound_type: 'SM'}
  const { reset, handleSubmit, control } = useForm<FormData>({
    defaultValues: { project, compound: defaultCompound },
  });

  const [userAccessOpen, setUserAccessOpen] = useState<boolean>(false);

  const { fields: userAccess, append, remove } = useFieldArray<FormData>({
    control,
    name: 'project.user_access',
  });

  useEffect(() => {
    reset({ project, compound });
  }, [project, compound, reset]);

  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (compound === undefined) {
    return <div>Error: cannot find compound...</div>;
  }

  const handleSave = (data: FormData) => {
    updateCompound({ id: `${compound?.id}`, compound: data.compound });
    updateProject({ id: `${project.id}`, project: data.project });
  };

  const handleDelete = () => {
    destroyProject({id: `${project.id}`});
  };

  const userAccessClose = () => {
    setUserAccessOpen(false);
  }


  return (
    <TableRow>
      <TableCell>
      <TextField label="Name" name="project.name" control={control} /> 
      </TableCell>
      <TableCell>
        <TextField label="Description" name="project.description" control={control} /> 
      </TableCell>
      <TableCell>
        <TextField label="Compound" name="compound.name" control={control} /> 
      </TableCell>
      <TableCell>
        <IconButton onClick={handleSubmit(handleSave)}>
          <Save />
        </IconButton>
        <IconButton onClick={handleDelete}>
          <Delete />
        </IconButton>
        <IconButton onClick={() => setUserAccessOpen(true)}>
          <PersonAdd />
        </IconButton>
        <UserAccess open={userAccessOpen} control={control} onClose={userAccessClose} userAccess={userAccess} append={append} remove={remove} />
      </TableCell>
      <TableCell>
        <SelectField label="Modality" options={modalityOptions} name="compound.compound_type" control={control} /> 
      </TableCell>
    </TableRow>
  );
};

export default ProjectRow;
