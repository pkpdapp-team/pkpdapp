import React, { useEffect } from "react";
import { useSelector, useDispatch } from 'react-redux'
import Button from '@material-ui/core/Button';
import { useForm } from "react-hook-form";
import { makeStyles } from '@material-ui/core/styles';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';

import {FormTextField, FormMultiSelectField, FormCheckboxField} from '../forms/FormComponents';
import {
  selectAllUsers
} from '../projects/usersSlice.js'

import {
  updateProject, chooseProject, deleteProject, 
  userHasReadOnlyAccess,
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

import {
  fetchInferences
} from '../inference/inferenceSlice.js'

import {
  fetchDraftInferences
} from '../inference/draftInferenceSlice.js'






const useStyles = makeStyles((theme) => ({
  table: {
    width: '100%',
  },
  tableCell: {
    width: '100pt',
  },
  controlsRoot: {
    display: 'flex',
    alignItems: 'center',
  },
  controls: {
    margin: theme.spacing(1),
  },

}));



export default function ProjectDetail({project}) {
  const classes = useStyles();
  const { control, handleSubmit, reset } = useForm();
  const dispatch = useDispatch()
  const users = useSelector(selectAllUsers);
  const userEntities = useSelector(state => state.users.entities);

  useEffect(() => {
    reset(project);
  }, [reset, project]);


  const user_options = users.map(user => (
    { key: user.username, value: user.id } 
  ));

  const onSubmit = (values) => {
    console.log('project detail submit', values)
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
    dispatch(fetchInferences(project))
  }

  const handleDeleteProject = () => {
    dispatch(deleteProject(project.id))
  }


  const disableSave = userHasReadOnlyAccess(project)

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
      <List dense>
      {project.user_access.map((ua, i) => {
        const user = userEntities[ua.user]
        if (!user) {
          return null
        }
        const read_only = ua.read_only
        return (
          <ListItem key={user.username}>
            <FormCheckboxField
              control={control} 
              defaultValue={read_only}
              name={`user_access[${i}].read_only`} 
              label={`${user.username} is read-only`}
            />
          </ListItem>
        )
      })}
      </List>
      <FormTextField 
        control={control} 
        className={classes.description}
        fullWidth
        multiline
        name="description" label="Description"
      />
      <div  className={classes.controlsRoot}>
      <Button 
        type="submit" 
        variant="contained"
        className={classes.controls} 
        disabled={disableSave}
      >
        Save
      </Button>
      <Button 
        variant="contained"
        className={classes.controls} 
        onClick={handleDeleteProject}
        disabled={disableSave}
      >
        Delete 
      </Button>

      <Button 
        variant="contained"
        className={classes.controls} 
        onClick={handleSelectProject}
      >
        Select Project
      </Button>
      </div>

    </form>
  )
}
