import React, { useEffect, useState } from "react";
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import { useForm, Controller  } from "react-hook-form";
import { makeStyles } from '@material-ui/core/styles';
import { FormTextField } from './FormComponents';
import { api } from './Api'


export default function CreateProjectDialog({project, open, handleClose, handleSave}) {
  const { control, handleSubmit, reset } = useForm();

  const defaultProject = {
      name: '',
      description: '',
  };

  const onSubmit = (values) => {
    const data = {
      ...values,
      users: [api.loggedInUser().id],
    }
    api.post('api/project/', data).then(handleSave);
    reset(defaultProject);
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
      <DialogTitle>Create New</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Fill in this form and you will create something new!
        </DialogContentText>
        <FormTextField 
          control={control} 
          defaultValue={defaultProject.name} 
          name="name" label="Name"
        />
        <FormTextField 
          control={control} 
          defaultValue={defaultProject.description} 
          name="description" label="Description"
          multiline
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="primary">
          Cancel
        </Button>
        <Button type="submit" color="primary">
          Create
        </Button>
      </DialogActions>
      </form>
    </Dialog>
  )
}
