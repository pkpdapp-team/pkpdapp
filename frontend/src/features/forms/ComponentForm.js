import React from "react";
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import {FormCheckboxField, FormSliderField, FormTextField } from '../forms/FormComponents';
import Box from "@material-ui/core/Box";

import MathJax from 'react-mathjax-preview'

const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
  }
}));

function VariableSlider({control, variable, type}) {
  const name = `${type}[${variable.qname}].default_value`
  return (
    <React.Fragment>
    
    <Box
      component="span"
      position="relative"
      height={120}
      width='100%'
      minWidth={200}
      mx={1}
    >
      <Box position="absolute" top={50} bottom={0} left={0} right={'60%'}>
        <FormTextField 
          control={control} 
          defaultValue={variable.lower_bound}
          inputProps={{step: 'any', style: { textAlign: 'left' }}} 
          name={`${type}[${variable.qname}].lower_bound`} 
          type="number"
          helperText="lower bound"
          size="small"
        />
      </Box>
      <Box position="absolute" top={50} bottom={0} left={'60%'} right={0} >
        <FormTextField 
          control={control} 
          defaultValue={variable.upper_bound}
          inputProps={{step: 'any', style: { textAlign: 'right' }}} 
          name={`${type}[${variable.qname}].upper_bound`} 
          helperText="upper bound"
          type="number"
          size="small"
        />
      </Box>
      <FormSliderField
        control={control} 
        defaultValue={variable.default_value}
        name={`${type}[${variable.qname}].default_value`} 
        label={`${variable.name} ${variable.unit}`}
        min={variable.lower_bound} max={variable.upper_bound}
      />
      </Box>
    </React.Fragment>
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
