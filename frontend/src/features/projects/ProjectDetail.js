import React, { useEffect } from "react";
import { useSelector, useDispatch } from 'react-redux'
import Button from '@material-ui/core/Button';
import { useForm } from "react-hook-form";
import { makeStyles } from '@material-ui/core/styles';

import {FormTextField, FormMultiSelectField} from '../forms/FormComponents';
import {
  selectAllUsers
} from '../projects/usersSlice.js'

import {
  updateProject, chooseProject
} from '../projects/projectsSlice.js'

import {
  fetchDatasets,
} from '../datasets/datasetsSlice.js'

import {
  fetchPkModels,
} from '../pkModels/pkModelsSlice.js'

import {
  fetchPdModels,
} from '../pdModels/pdModelsSlice.js'

import {
  fetchBasePkModels
} from '../pkModels/basePkModelsSlice.js'

import {
  fetchProtocols 
} from '../protocols/protocolsSlice.js'

import {
  fetchVariables
} from '../variables/variablesSlice.js'





const useStyles = makeStyles((theme) => ({
  table: {
    width: '100%',
  },
  tableCell: {
    width: '100pt',
  },
  controls: {
    marginTop: theme.spacing(2),
    marginRight: theme.spacing(2),
  },
}));



export default function ProjectDetail({project}) {
  const classes = useStyles();
  const { control, handleSubmit, reset } = useForm();
  const dispatch = useDispatch()
  const users = useSelector(selectAllUsers);

  useEffect(() => {
    reset(project);
  }, [reset, project]);


  const user_options = users.map(user => (
    { key: user.username, value: user.id } 
  ));

  const onSubmit = (values) => {
    dispatch(updateProject(values))
  };

  const handleSelectProject = () => {
    dispatch(chooseProject(project))
    dispatch(fetchDatasets(project))
    dispatch(fetchPkModels(project))
    dispatch(fetchPdModels(project))
    dispatch(fetchPkModels(project))
    dispatch(fetchVariables(project))
    dispatch(fetchBasePkModels(project))
    dispatch(fetchProtocols(project))
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
      <FormTextField 
        control={control} 
        defaultValue={project.name}
        name="name" label="Name"
      />
      { user_options.length > 0 &&
      <FormMultiSelectField 
        control={control} 
        defaultValue={project.users}
        options={user_options}
        name="users" label="Users"
      />
      }
      <FormTextField 
        control={control} 
        className={classes.description}
        fullWidth
        multiline
        name="description" label="Description"
      />
      <Button 
        type="submit" 
        variant="contained"
        className={classes.controls} 
      >
        Save
      </Button>
      <Button 
        variant="contained"
        className={classes.controls} 
        onClick={handleSelectProject}
      >
        Select Project
      </Button>

    </form>
  )
}
