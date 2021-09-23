import React from "react";
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';

import MathJaxPreview from 'react-mathjax-preview'

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
    CommonHTML: { linebreaks: {automatic: true}},
    SVG: { linebreaks: {automatic: true}},
    "HTML-CSS": { linebreaks: {automatic: true}},
  }
  const sortedVariables = [...(component.variables)].sort()
  const sortedStates = [...(component.states)].sort()
  const sortedOutputs= [...(component.outputs)].sort()

  return (
    <div id="component-form-root" className={classes.root}>
    <Grid container item xs={12} spacing={3}>
    <Grid item xs={6}>
    <Typography>Variables</Typography>
    <List>
    {sortedVariables.map((variable, index) => {
      return (
        <ListItem key={index} role={undefined} dense >
        <VariableSubform
          variable_id={variable}
        />
        </ListItem>
      );
    })}
    </List>
    </Grid>
    <Grid item xs={6}>
    <Typography>Initial Conditions</Typography>
    <List>
    {sortedStates.map((state, index) => {
      return (
        <ListItem key={index} role={undefined} dense >
          <VariableSubform
            variable_id={state}
          />
        </ListItem>
      );
    })}
    </List>
    </Grid>
    </Grid>
    <Typography>Outputs</Typography>
    <List>
    {sortedOutputs.map((output, index) => {
      return (
        <ListItem key={index} role={undefined} dense button >
          <OutputSubform
            variable_id={output}
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
          <MathJaxPreview 
              math={eq} 
              style={{
                "max-width": 600,
              }}
              config={mathjaxConfig}
          />
        </ListItem>
      );
    })}
    </List>
    </div>

    
  )
}
