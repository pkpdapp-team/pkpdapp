import React from "react";
import Grid from '@material-ui/core/Grid';
import { useSelector } from 'react-redux'
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import {FormCheckboxField, FormSliderField, FormTextField } from '../forms/FormComponents';
import Box from "@material-ui/core/Box";

import MathJax from 'react-mathjax-preview'
import { selectUnitById } from '../projects/unitsSlice'

import VariableSlider from '../variables/VariableForm'

const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
  }
}));

function OutputCheckbox({control, output}) {
  const unit_id = output.unit
  const unit = useSelector(state => selectUnitById(state, unit_id));
  return (
    <FormCheckboxField
      control={control} 
      defaultValue={output.default_value}
      name={`outputs[${output.qname}].default_value`} 
      label={`${output.name} ${unit.symbol}`}
    />
  )
}
 

export default function ComponentForm({control, component}) {
  const classes = useStyles();
  return (
    <div className={classes.root}>
    <Grid container item xs={12} spacing={3}>
    <Grid item xs={6}>
    <Typography>Variables</Typography>
    <List>
    {component.variables.map((variable, index) => {
      return (
        <ListItem key={index} role={undefined} dense >
        <VariableSlider 
          control={control} variable={variable} type={'variable'}
        />
        </ListItem>
      );
    })}
    </List>
    </Grid>
    <Grid item xs={6}>
    <Typography>Initial Conditions</Typography>
    <List>
    {component.states.map((state, index) => {
      return (
        <ListItem key={index} role={undefined} dense >
          <VariableSlider 
            control={control} variable={state} type={'state'}
          />
        </ListItem>
      );
    })}
    </List>
    </Grid>
    </Grid>
    <Typography>Outputs</Typography>
    <List>
    {component.outputs.map((output, index) => {
      return (
        <ListItem key={index} role={undefined} dense button >
          <OutputCheckbox
            control={control} output={output}
          />
        </ListItem>
      );
    })}
    </List>

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
    </div>

    
  )
}
