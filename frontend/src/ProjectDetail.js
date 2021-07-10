import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from 'react-redux'
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import { useForm, Controller  } from "react-hook-form";
import { makeStyles } from '@material-ui/core/styles';
import {FormTextField, FormMultiSelectField} from './FormComponents';
import Typography from '@material-ui/core/Typography';

import {
  selectAllUsers
} from './features/projects/usersSlice.js'

import {
  updateProject
} from './features/projects/projectsSlice.js'


export default function ProjectDetail({project}) {
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
      <Typography>Project</Typography>
      <FormTextField 
        control={control} 
        defaultValue={project.name}
        name="name" label="Name"
      />
      { user_options.length > 0 &&
      <FormMultiSelectField 
        control={control} 
        defaultValue={project.users.map(x => x.id)}
        options={user_options}
        name="user_ids" label="Users"
      />
      }
      <Button type="submit" color="primary">
        Save
      </Button>
    </form>
  )
}
