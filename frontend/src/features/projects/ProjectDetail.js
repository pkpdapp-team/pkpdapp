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
  updateProject
} from '..//projects/projectsSlice.js'

const useStyles = makeStyles((theme) => ({
  table: {
    width: '100%',
  },
  tableCell: {
    width: '100pt',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    marginTop: theme.spacing(1),
    paddingLeft: theme.spacing(1),
    paddingBottom: theme.spacing(1),
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
    </form>
  )
}