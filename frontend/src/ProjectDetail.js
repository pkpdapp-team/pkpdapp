import React, { useEffect, useState } from "react";
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

import { api } from './Api'

export default function ProjectDetail({project}) {
  const { control, handleSubmit, reset } = useForm();

  useEffect(() => {
    reset({
      ...project,
      user_ids: project.users.map(x => x.id),
    });
  }, [reset, project]);


  const [users, setUsers] = React.useState([]);

  useEffect(() => {
    api.get("/api/users").then(setUsers);
  },[])

  const user_options = users.map(user => (
    { key: user.username, value: user.id } 
  ));

  const onSubmit = (values) => {
    const data = {
      ...values,
    }
    api.put(`api/project/${project.id}/`, data)
      .then(data => {
        project.refresh(project.id)
      });
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
