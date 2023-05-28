// src/components/ProjectTable.tsx
import React, { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useDispatch } from "react-redux";
import {
  TableCell,
  TableRow,
  IconButton,
  Radio,
} from "@mui/material";
import { Delete, PersonAdd } from "@mui/icons-material";
import { Compound, Project, ProjectAccess, useProjectDestroyMutation, useCompoundRetrieveQuery, useCompoundUpdateMutation, useProjectUpdateMutation } from "../../app/backendApi";
import SelectField from "../../components/SelectField";
import UserAccess from "./UserAccess";
import { selectProject } from "../main/mainSlice";
import TextField from "../../components/TextField";

interface Props {
  project: Project;
  isSelected: boolean;
}

export interface FormData {
  project: Project;
  compound: Compound;
}

const ProjectRow: React.FC<Props> = ({ project, isSelected }) => {
  const dispatch = useDispatch();
  const [
    updateProject, // This is the mutation trigger
    { isLoading: isUpdatingProject }, // This is the destructured mutation result
  ] = useProjectUpdateMutation()
  
   const [
    updateCompound, // This is the mutation trigger
    { isLoading: isUpdatingCompound }, // This is the destructured mutation result
  ] = useCompoundUpdateMutation()


  const [
    destroyProject, // This is the mutation trigger
    { isLoading: isDestroying }, // This is the destructured mutation result
  ] = useProjectDestroyMutation()
  
  const modalityOptions = [
    { value: "SM", label: "Small Molecule" },
    { value: "LM", label: "Large Molecule" },
  ]


  const { data: compound, error, isLoading } = useCompoundRetrieveQuery({id: project.compound})
  const defaultCompound: Compound = {
    id: 1, 
    name: '', 
    description: '', 
    compound_type: 'SM',
    efficacy_experiments: [],
    molecular_mass: 100,
    target_molecular_mass: 100,
  }
  const { reset, handleSubmit, control, formState: { isDirty } } = useForm<FormData>({
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
  
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (isDirty) {
        handleSubmit(handleSave)();
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [handleSubmit, isDirty, updateCompound]);


  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (compound === undefined) {
    return <div>Error: cannot find compound...</div>;
  }

  const handleSave = (data: FormData) => {
    updateCompound({ id: compound?.id, compound: data.compound });
    updateProject({ id: project.id, project: data.project });
  };

  const handleDelete = () => {
    console.log('destroying project', project.id)
    destroyProject({id: project.id});
  };

  const userAccessClose = () => {
    setUserAccessOpen(false);
  }

  const handleSelectProject = () => {
    dispatch(selectProject(project.id));
  }

  const defaultProps = {
    fullWidth: true,
  }

  return (
    <TableRow>
      <TableCell>
      <Radio checked={isSelected} onClick={handleSelectProject}/> 
      </TableCell>
      <TableCell>
        <TextField name="project.name" control={control} textFieldProps={defaultProps} /> 
      </TableCell>
      <TableCell>
        <TextField name="project.description" control={control} textFieldProps={defaultProps} /> 
      </TableCell>
      <TableCell>
        <TextField name="compound.name" control={control} textFieldProps={defaultProps} /> 
      </TableCell>
      <TableCell>
        <IconButton onClick={handleDelete}>
          <Delete />
        </IconButton>
        <IconButton onClick={() => setUserAccessOpen(true)}>
          <PersonAdd />
        </IconButton>
        <UserAccess open={userAccessOpen} control={control} onClose={userAccessClose} userAccess={userAccess as ProjectAccess[]} append={append} remove={remove} project={project}/>
      </TableCell>
      <TableCell>
        <SelectField options={modalityOptions} name="compound.compound_type" control={control} selectProps={defaultProps}/> 
      </TableCell>
    </TableRow>
  );
};

export default ProjectRow;
