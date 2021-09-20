import React from "react";
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';

import MathJax from 'react-mathjax-preview'

import VariableSubform from '../variables/VariableSubform'
import OutputSubform from '../variables/OutputSubform'

const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
  }
}));


export default function ComponentForm({control, component}) {
  const classes = useStyles();
  const mathjaxConfig = {
    chtml: {
      scale: 0.5, 
    },
  }
  return (
    <div className={classes.root}>
    <Grid container item xs={12} spacing={3}>
    <Grid item xs={6}>
    <Typography>Variables</Typography>
    <List>
    {component.variables.map((variable, index) => {
      return (
        <ListItem key={index} role={undefined} dense >
        <VariableSubform
          control={control} variable_id={variable}
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
          <VariableSubform
            control={control} variable_id={state}
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
          <OutputSubform
            control={control} variable_id={output}
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
          <MathJax 
              math={eq} 
              config={mathjaxConfig}
          />
        </ListItem>
      );
    })}
    </List>
    </div>

    
  )
}
