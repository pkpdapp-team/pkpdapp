import React from "react";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import makeStyles from '@mui/styles/makeStyles';
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";

import MathJaxPreview from "react-mathjax-preview";

import VariableSubform from "../variables/VariableSubform";
import OutputSubform from "../variables/OutputSubform";

const useStyles = makeStyles((theme) => ({
  root: {
    width: "100%",
  },
}));

export default function ComponentForm({ control, component, disableSave }) {
  const classes = useStyles();

  const mathjaxConfig = {
    CommonHTML: { linebreaks: { automatic: true } },
    SVG: { linebreaks: { automatic: true } },
    "HTML-CSS": { linebreaks: { automatic: true } },
  };
  const sortedVariables = [...component.variables].sort();
  const sortedStates = [...component.states].sort();
  const sortedOutputs = [...component.outputs].sort();

  return (
    <div id="component-form-root" className={classes.root}>
      <Grid container item xs={12} spacing={3}>
        <Grid item xs={6}>
          <Typography>Variables</Typography>
          <List>
            {sortedVariables.map((variable, index) => {
              return (
                <ListItem key={index} role={undefined} dense>
                  <VariableSubform
                    variable_id={variable}
                    disableSave={disableSave}
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
                <ListItem key={index} role={undefined} dense>
                  <VariableSubform variable_id={state} />
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
            <ListItem key={index} role={undefined} dense button>
              <OutputSubform variable_id={output} disableSave={disableSave} />
            </ListItem>
          );
        })}
      </List>
    </div>
  );
}
