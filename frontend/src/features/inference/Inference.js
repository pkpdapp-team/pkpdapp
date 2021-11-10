import React from "react";
import { useSelector } from 'react-redux'
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';
import InferenceDetail from './InferenceDetail'
import InferenceChart from './InferenceChart'
import Accordion from '@material-ui/core/Accordion';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import CircularProgress from '@material-ui/core/CircularProgress'
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import Typography from '@material-ui/core/Typography';

import { makeStyles } from '@material-ui/core/styles';

import {
  selectChosenProject
} from '../projects/projectsSlice.js'

import {
  selectChosenInferences
} from './inferenceSlice.js'

const useStyles = makeStyles((theme) => ({
  root: {
    marginTop: theme.spacing(2),
    flexGrow: 1,
  },
  chartPaper: {
    padding: theme.spacing(2),
  },
}));


export default function Modelling() {
  const classes = useStyles();
  const project = useSelector(selectChosenProject);
  const chosenInferences = useSelector(selectChosenInferences);
  if (!project) {
    return ('Select a project')
  }
  let showChart = true
  if (
    chosenInferences.length === 0
  ) {
    showChart = false
  }
  
  return (
    <div className={classes.root}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper className={classes.chartPaper}>
            {showChart &&
            <InferenceChart inference={chosenInferences} />
            }
            {!showChart &&
              <Typography>
                Choose a dataset or model to visualise
              </Typography>
            }
          </Paper>
        </Grid>
        <Grid item xs={12} md={6} >
        {chosenInferences.map(inference => {
          const loading = inference.status ? inference.status === 'loading' : false
          const expandIcon = loading ? 
            (<CircularProgress size={20}/>)
            : (<ExpandMoreIcon />)
          return (
          <Accordion key={inference.id}>
            <AccordionSummary expandIcon={expandIcon}>
              <Typography className={classes.heading}>
                Inference - {inference.name}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {!loading &&
              <InferenceDetail  inference={inference} project={project}/>
              }
            </AccordionDetails>
          </Accordion>
          )
        })}
        </Grid>
        
      </Grid>
    </div>
  )
}
