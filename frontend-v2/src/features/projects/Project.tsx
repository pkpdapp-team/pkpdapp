// src/components/ProjectTable.tsx
import React, { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useDispatch } from "react-redux";
import {
  TableCell,
  TableRow,
  IconButton,
  Radio,
  Box,
} from "@mui/material";
import { Delete, PersonAdd } from "@mui/icons-material";
import { Compound, Project, ProjectAccess, useProjectDestroyMutation, useCompoundRetrieveQuery, useCompoundUpdateMutation, useProjectUpdateMutation } from "../../app/backendApi";
import SelectField from "../../components/SelectField";
import UserAccess from "./UserAccess";
import { setProject } from "../main/mainSlice";
import TextField from "../../components/TextField";
import useDirty from "../../hooks/useDirty";
import ConfirmationDialog from "../../components/ConfirmationDialog";

interface Props {
  project: Project;
  isSelected: boolean;
  otherProjectNames: string[];
}

export interface FormData {
  project: Project;
  compound: Compound;
}

const ProjectRow: React.FC<Props> = ({ project, isSelected, otherProjectNames }) => {
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

  const [showConfirmDelete, setShowConfirmDelete] = useState<boolean>(false);


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
  useDirty(isDirty);

  const [userAccessOpen, setUserAccessOpen] = useState<boolean>(false);

  const { fields: userAccess, append, remove } = useFieldArray<FormData>({
    control,
    name: 'project.user_access',
  });

  useEffect(() => {
    reset({ project, compound });
  }, [project, compound, reset]);

  const handleSave = handleSubmit((data: FormData) => {
    if (compound && project) {
      console.log('save', data, compound)
      if (JSON.stringify(compound) !== JSON.stringify(data.compound)) {
        updateCompound({ id: compound.id, compound: data.compound });
      }
      if (JSON.stringify(project) !== JSON.stringify(data.project)) {
        updateProject({ id: project.id, project: data.project });
      }
    }
  });
  
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (isDirty) {
        handleSave();
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [handleSave, isDirty]);

  useEffect(() => () => { handleSave(); }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (compound === undefined) {
    return <div>Error: cannot find compound...</div>;
  }

  
  const handleDelete = () => {
    destroyProject({id: project.id});
  };

  const userAccessClose = () => {
    setUserAccessOpen(false);
  }

  const handleSelectProject = () => {
    dispatch(setProject(project.id));
  }

  const defaultProps = {
    fullWidth: true,
  }

  const speciesOptions = [
    { value: "M", label: "Mouse" },
    { value: "R", label: "Rat" },
    { value: "K", label: "Monkey" },
    { value: "H", label: "Human" },
    { value: "O", label: "Other" },
  ]

  const validateName = (value: string) => {
    if (otherProjectNames.includes(value)) {
      return 'Name must be unique';
    }
    return true;
  };

  return (
    <React.Fragment>
    <TableRow data-cy={`project-${project.id}`}>
      <TableCell rowSpan={isSelected ? 2 : 1} sx={{ verticalAlign: 'top'}} padding='checkbox' >
      <Radio sx={{ marginTop: 4 }} checked={isSelected} onClick={handleSelectProject}/> 
      </TableCell>
      <TableCell>
        <TextField name="project.name" control={control} textFieldProps={defaultProps} rules={{ required: true, validate: validateName }} /> 
      </TableCell>
      <TableCell>
        <SelectField name="project.species" options={speciesOptions} control={control} selectProps={defaultProps} /> 
      </TableCell>
      <TableCell>
        <TextField name="compound.name" control={control} textFieldProps={defaultProps} rules={{ required: true }} /> 
      </TableCell>
      <TableCell>
        <IconButton onClick={() => setShowConfirmDelete(true)}>
          <Delete />
        </IconButton>
        <ConfirmationDialog open={showConfirmDelete} title="Delete Project" message="Are you sure you want to permanently delete this project?" onConfirm={handleDelete} onCancel={() => setShowConfirmDelete(false)} />
        <IconButton onClick={() => setUserAccessOpen(true)}>
          <PersonAdd />
        </IconButton>
        <UserAccess open={userAccessOpen} control={control} onClose={userAccessClose} userAccess={userAccess as ProjectAccess[]} append={append} remove={remove} project={project}/>
      </TableCell>
      <TableCell>
        { modalityOptions.find(m => m.value === compound.compound_type)?.label }
      </TableCell>
    </TableRow>
    { isSelected && (
      <TableRow>
        <TableCell colSpan={5}>
          <TextField label="Description" name="project.description" control={control} textFieldProps={{...defaultProps, multiline: true}} /> 
        </TableCell>

      </TableRow>
    )}
    </React.Fragment>
  );
};

export default ProjectRow;
