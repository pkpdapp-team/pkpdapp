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

import { api } from './Api'



export default function CreatePkModelDialog({project, open, handleClose, handleSave}) {
  const { control, handleSubmit, reset } = useForm();

  const [basePkModels, setBasePkModels] = React.useState([]);

  useEffect(() => {
    api.get("/api/pharmacokinetic").then(setBasePkModels);
  },[])

  const defaultModel = {
      name: '',
      pharmacokinetic_model_id: 1,
      dose_compartment: 'central',
      protocol: '',
      time_max: 30
  };

  const onSubmit = (values) => {
    const data = {
      ...values,
    }
    reset(defaultModel);
    api.post(`api/dosed_pharmacokinetic/`, data).then(new_item => {
      const project_pk_model_ids = [
        ...project.pk_models.map(m => m.id),
        new_item.id,
      ];
      console.log(project_pk_model_ids);
      return api.patch(`api/project/${project.id}/`, {
        id: project.id,
        pk_model_ids: project_pk_model_ids,
      }).then(data => {console.log(data);});
    }).then(handleSave);
  };

  const base_pk_model_options = basePkModels.map(pk => (
    {key: pk.name, value: pk.id}
  ));

  let protocol_options = project.protocols.map(protocol => (
    {key: protocol.name, value: protocol.id}
  ));
  for (let i = 0; i < project.datasets.length; i++) {
    const dataset_protocols = project.datasets[i].protocols.map(protocol => (
    {key: protocol.name, value: protocol.id}
    ));
    protocol_options = protocol_options.concat(dataset_protocols);
  }
  

  const dose_compartment_options = [
    {key: 'central', value: 'central'},
    {key: 'peripheral1', value: 'peripheral1'},
    {key: 'peripheral2', value: 'peripheral2'},
  ];

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
          defaultValue={defaultModel.name} 
          name="name" label="Name"
        />
        <FormSelectField 
          control={control} 
          defaultValue={defaultModel.pharmacokinetic_model_id} 
          options={base_pk_model_options}
          name="pharmacokinetic_model_id" label="Base Pharmacokinetic Model"
        />
        <FormSelectField 
          control={control} 
          defaultValue={defaultModel.dose_compartment} 
          options={dose_compartment_options}
          name="dose_compartment" label="Dose Compartment"
        />
        <FormSelectField 
          control={control} 
          defaultValue={defaultModel.protocol} 
          options={protocol_options}
          name="protocol" label="Protocol"
        />
        <FormTextField 
          control={control} 
          defaultValue={defaultModel.time_max} 
          name="time_max" label="Maximum Time"
          type="number"
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
