import React from "react";
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import {FormCheckboxField, FormSliderField } from '../forms/FormComponents';

import MathJax from 'react-mathjax-preview'


export default function ComponentForm({control, component}) {
  return (
    <Grid container item xs={12} spacing={3}>
    <Grid item xs={4}>
    <Typography>Initial Conditions</Typography>
    <List>
    {component.states.map((state, index) => {
      return (
        <ListItem key={index} role={undefined} dense >
          <FormSliderField
            control={control} 
            defaultValue={state.default_value}
            name={`states[${state.qname}].default_value`} 
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
    {component.variables.map((variable, index) => {
      return (
        <ListItem key={index} role={undefined} dense >
          <FormSliderField
            control={control} 
            defaultValue={variable.default_value}
            name={`variables[${variable.qname}].default_value`} 
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
    {component.outputs.map((output, index) => {
      return (
        <ListItem key={index} role={undefined} dense button >
          <FormCheckboxField
            control={control} 
            defaultValue={output.default_value}
            name={`outputs[${output.qname}].default_value`} 
            label={`${output.name} ${output.unit}`}
          />
        </ListItem>
      );
    })}
    </List>

    </Grid>
    <Typography>Equations</Typography>
    <List>
    {component.equations.map((eq, index) => {
      return (
        <ListItem key={index}>
          <MathJax math={eq} />
        </ListItem>
      );
    })}
    </List>
    </Grid>

    
  )
}
