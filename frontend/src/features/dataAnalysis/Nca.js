import React from "react";
import { useSelector } from 'react-redux'
import Grid from '@material-ui/core/Grid';
import Accordion from '@material-ui/core/Accordion';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import CircularProgress from '@material-ui/core/CircularProgress'
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import Typography from '@material-ui/core/Typography';

import { makeStyles } from '@material-ui/core/styles';
import NcaDetail from './NcaDetail'

import {
  selectChosenProject
} from '../projects/projectsSlice.js'

import {
  selectChosenDatasets
} from '../datasets/datasetsSlice.js'

const useStyles = makeStyles((theme) => ({
  root: {
    marginTop: theme.spacing(2),
    flexGrow: 1,
  },
  chartPaper: {
    padding: theme.spacing(2),
  },
}));


export default function Nca() {
  const classes = useStyles();
  const project = useSelector(selectChosenProject);
  const chosenDatasets = useSelector(selectChosenDatasets);
  if (!project) {
    return ('Select a project')
  }
  
  return (
    <div className={classes.root}>
      <Grid container spacing={3}>
        <Grid item xs={12} >
        {chosenDatasets.map(dataset => {
          const loading = dataset.status ? dataset.status === 'loading' : false
          const expandIcon = loading ? 
            (<CircularProgress size={20}/>)
            : (<ExpandMoreIcon />)
          return (
          <Accordion key={dataset.id}>
            <AccordionSummary expandIcon={expandIcon}>
              <Typography className={classes.heading}>
                Dataset - {dataset.name}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {!loading &&
              <NcaDetail dataset={dataset} project={project}/>
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
