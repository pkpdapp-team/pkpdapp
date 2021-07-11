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
import Typography from '@material-ui/core/Typography';

import {FormTextField, FormSelectField} from '../forms/FormComponents';

import {
  selectAllBasePkModels
} from '../pkModels/basePkModelsSlice.js'

import {
  selectAllDatasets
} from '../datasets/datasetsSlice.js'

import {
  selectAllProtocols
} from '../pkModels/protocolsSlice.js'

import {
  updatePkModel
} from '../pkModels/pkModelsSlice.js'

export default function PkDetail({project, pk_model}) {
  const { control, handleSubmit, reset } = useForm();
  const dispatch = useDispatch();

  const basePkModels = useSelector(selectAllBasePkModels);
  const protocols = useSelector(selectAllProtocols);
  const datasets = useSelector(selectAllDatasets);

  useEffect(() => {
    reset(pk_model);
  }, [reset, pk_model]);

  const onSubmit = (values) => {
    dispatch(updatePkModel(values));
  };

  const base_pk_model_options = basePkModels.map(pk => (
    {key: pk.name, value: pk.id}
  ));

  let protocol_options = [{key: 'None', value: ''}];
  protocol_options = protocol_options.concat(
    protocols.map(protocol => (
      {key: protocol.name, value: protocol.id}
    ))
  );
  for (let i = 0; i < datasets.length; i++) {
    const dataset_protocols = datasets[i].protocols.map(protocol => (
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
        defaultValue={pk_model.pharmacokinetic_model}
        options={base_pk_model_options}
        name="pharmacokinetic_model" label="Base Pharmacokinetic Model"
      />
      <FormSelectField 
        control={control} 
        defaultValue={pk_model.dose_compartment}
        options={dose_compartment_options}
        name="dose_compartment" label="Dose Compartment"
      />
      <FormSelectField 
        control={control} 
        defaultValue={pk_model.protocol}
        options={protocol_options}
        name="protocol" label="Protocol"
      />
      <FormTextField 
        control={control} 
        defaultValue={pk_model.time_max}
        name="time_max" label="Maximum Time"
        type="number"
      />

      <Button 
        type="submit" 
        variant="contained"
      >
        Save
      </Button>
    </form>
  )
}
