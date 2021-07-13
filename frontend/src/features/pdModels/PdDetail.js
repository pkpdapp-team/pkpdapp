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
import Grid from '@material-ui/core/Grid';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';


import {updatePdModel} from '../pdModels/pdModelsSlice'
import {FormCheckboxField, FormTextField, FormSelectField, FormSliderField} from '../forms/FormComponents';

const useStyles = makeStyles((theme) => ({
  controls: {
    display: 'flex',
    alignItems: 'center',
    paddingLeft: theme.spacing(1),
    paddingBottom: theme.spacing(1),
  },
}));



export default function PdDetail({project, pd_model}) {
  const classes = useStyles();
  const { control, handleSubmit, reset } = useForm();
  const dispatch = useDispatch();

  console.log('pddetail', pd_model);

  useEffect(() => {
    reset(pd_model);
  }, [reset, pd_model]);

  const onSubmit = (values) => {
    dispatch(updatePdModel(values))
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
      <Typography>PD Model</Typography>

      <FormTextField 
        control={control} 
        defaultValue={pd_model.name}
        name="name" label="Name"
      />

      <Grid container item xs={12} spacing={3}>
      <Grid item xs={4}>
      <Typography>Initial Conditions</Typography>
      <List>
      {pd_model.states.map((state, index) => {
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
      {pd_model.variables.map((variable, index) => {
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
      {pd_model.outputs.map((output, index) => {
        return (
          <ListItem key={index} role={undefined} dense button >
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

      <FormTextField 
        control={control} 
        defaultValue={pd_model.time_max}
        name="time_max" label="Maximum Time"
        type="number"
      />

      <Button 
        className={classes.controls}
        type="submit" 
        variant="contained"
      >
        Save
      </Button>
    </form>
  )
}
