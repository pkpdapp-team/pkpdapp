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

export default function PkDetail({project, pk_model}) {
  const { control, handleSubmit, reset } = useForm();

  const [basePkModels, setBasePkModels] = React.useState([]);

  useEffect(() => {
    api.get("/api/pharmacokinetic").then(setBasePkModels);
  },[])

  useEffect(() => {
    reset({
      ...pk_model,
      protocol_id: pk_model.protocol ? pk_model.protocol.id : '',
      pharmacokinetic_model_id: pk_model.pharmacokinetic_model.id,
    });
  }, [pk_model]);

  const onSubmit = (values) => {
    const data = {
      ...values,
    }
    api.put(`api/dosed_pharmacokinetic/${pk_model.id}/`, data)
      .then(project.refresh(project.id));
  };

  const base_pk_model_options = basePkModels.map(pk => (
    {key: pk.name, value: pk.id}
  ));

  let protocol_options = [{key: 'None', value: ''}];
  const project_protocols = project.protocols.map(protocol => (
    {key: protocol.name, value: protocol.id}
  ));
  protocol_options = protocol_options.concat(project_protocols);
  for (let i = 0; i < project.datasets.length; i++) {
    const dataset_protocols = project.datasets[i].protocols.map(protocol => (
    {key: protocol.name, value: protocol.id}
    ));
    protocol_options = protocol_options.concat(dataset_protocols);
  }
  console.log(base_pk_model_options);

  const dose_compartment_options = [
    {key: 'central', value: 'central'},
    {key: 'peripheral1', value: 'peripheral1'},
    {key: 'peripheral2', value: 'peripheral2'},
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
      <Typography>PK Model</Typography>
      <FormTextField 
        control={control} 
        name="name" label="Name"
      />
      <FormSelectField 
        control={control} 
        defaultValue={pk_model.pharmacokinetic_model.id}
        options={base_pk_model_options}
        name="pharmacokinetic_model_id" label="Base Pharmacokinetic Model"
      />
      <FormSelectField 
        control={control} 
        defaultValue={pk_model.dose_compartment}
        options={dose_compartment_options}
        name="dose_compartment" label="Dose Compartment"
      />
      <FormSelectField 
        control={control} 
        defaultValue={pk_model.protocol ? pk_model.protocol.id : ''}
        options={protocol_options}
        name="protocol_id" label="Protocol"
      />
      <FormTextField 
        control={control} 
        defaultValue={pk_model.time_max}
        name="time_max" label="Maximum Time"
        type="number"
      />

      <Button type="submit" color="primary">
        Save
      </Button>
    </form>
  )
}
