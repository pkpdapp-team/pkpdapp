import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from 'react-redux'
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import Grid from '@material-ui/core/Grid';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';

import { useForm, Controller  } from "react-hook-form";
import { makeStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import Checkbox from '@material-ui/core/Checkbox';

import {FormTextField, FormSelectField, FormSliderField, FormCheckboxField} from '../forms/FormComponents';

import {
  selectAllBasePkModels
} from '../pkModels/basePkModelsSlice.js'

import {
  selectAllDatasets
} from '../datasets/datasetsSlice.js'

import {
  selectAllProtocols
} from '../protocols/protocolsSlice.js'

import {
  updatePkModel
} from '../pkModels/pkModelsSlice.js'

const useStyles = makeStyles((theme) => ({
  controls: {
    display: 'flex',
    alignItems: 'center',
    paddingLeft: theme.spacing(1),
    paddingBottom: theme.spacing(1),
    '& > *': {
      margin: theme.spacing(1),
    },
  },
}));


export default function PkDetail({project, pk_model}) {
  const classes = useStyles();
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

  let protocol_options = [
    {key: 'None', value: ''},
  ];
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
      <Grid container item xs={12} spacing={2}>
      <Grid item xs={4}>
      <Typography>Initial Conditions</Typography>
      <List>
      {pk_model.states.map((state, index) => {
        return (
          <ListItem key={index} role={undefined} dense >
            <FormSliderField
              control={control} 
              defaultValue={state.default_value}
              name={`states[${index}].default_value`} 
              label={`${state.name} ${state.unit}`}
              min={state.lower_bound} max={state.upper_bound}
            />
          </ListItem>
        );
      })}
      </List>
      </Grid>
      <Grid item xs={4}>
      <Typography>Variables</Typography>
      <List>
      {pk_model.variables.map((variable, index) => {
        return (
          <ListItem key={index} role={undefined} dense >
            <FormSliderField
              control={control} 
              defaultValue={variable.default_value}
              name={`variables[${index}].default_value`} 
              label={`${variable.name} ${variable.unit}`}
              min={variable.lower_bound} max={variable.upper_bound}
            />
          </ListItem>
        );
      })}
      </List>
      </Grid>

      <Grid item xs={4}>
      <Typography>Outputs</Typography>
      <List>
      {pk_model.outputs.map((output, index) => {
        return (
          <ListItem key={index} role={undefined} dense>
            <FormCheckboxField
              control={control} 
              defaultValue={output.default_value}
              name={`outputs[${index}].default_value`} 
              label={`${output.name} ${output.unit}`}
            />
          </ListItem>
        );
      })}
      </List>

      </Grid>
      </Grid>


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

      <div className={classes.controls}>
      <Button 
        type="submit" 
        variant="contained"
      >
        Save
      </Button>

      </div>
    </form>
  )
}
