import React, { useEffect, useState } from "react";
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import { useForm, Controller  } from "react-hook-form";
import { makeStyles } from '@material-ui/core/styles';
import {FormTextField, FormSelectField} from './FormComponents';
import Typography from '@material-ui/core/Typography';

import { api } from './Api'

export default function PdDetail({project, pd_model}) {
  const { control, handleSubmit, reset } = useForm();

  console.log('pddetail', pd_model);

  useEffect(() => {
    console.log('reset', pd_model);
    reset({
      ...pd_model,
    });
  }, [reset, pd_model]);

  const onSubmit = (values) => {
    const data = {
      ...values,
    }
    api.put(`api/pharmacodynamic/${pd_model.id}/`, data)
      .then(project.refresh(project.id));
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
      <Typography>PD Model</Typography>
      <FormTextField 
        control={control} 
        defaultValue={pd_model.name}
        name="name" label="Name"
      />
      <FormTextField 
        control={control} 
        defaultValue={pd_model.time_max}
        name="time_max" label="Maximum Time"
        type="number"
      />

      <Button type="submit" color="primary">
        Save
      </Button>
    </form>
  )
}
