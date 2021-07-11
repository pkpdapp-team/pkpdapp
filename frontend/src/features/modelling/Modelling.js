import React from "react";
import { useSelector } from 'react-redux'
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';
import PkDetail from '../pkModels/PkDetail'
import PdDetail from '../pdModels/PdDetail'
import ProjectDetail from '../projects/ProjectDetail'
import ProtocolDetail from '../pkModels/ProtocolDetail'
import DatasetDetail from '../datasets/DatasetDetail'
import Chart from './Chart'
import ChartController from './ChartController'

import { makeStyles } from '@material-ui/core/styles';

import {
  selectChosenProject
} from '../projects/projectsSlice.js'

import {
  selectChosenDatasets
} from '../datasets/datasetsSlice.js'

import {
  selectChosenPdModels
} from '../pdModels/pdModelsSlice.js'

import {
  selectChosenPkModels
} from '../pkModels/pkModelsSlice.js'




const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
  },
  paper: {
    padding: theme.spacing(2),
    textAlign: 'left',
  },
}));


export default function Modelling() {
  const classes = useStyles();
  const project = useSelector(selectChosenProject);
  const chosenDatasets = useSelector(selectChosenDatasets);
  const chosenPkModels = useSelector(selectChosenPkModels);
  const chosenPdModels = useSelector(selectChosenPdModels);

  if (!project) {
    return ('Select a project')
  }

  return (
    <div className={classes.root}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper className={classes.paper}>
            <ProjectDetail project={project}/>
          </Paper>
        </Grid>
          <Grid item xs={8}>
            <Paper className={classes.paper}>
              <Chart />
            </Paper>
          </Grid>
          <Grid item xs={4}>
            <Paper className={classes.paper}>
              <ChartController />
            </Paper>
          </Grid>
          {chosenDatasets.map(dataset => (
            <Grid item xs={12} key={dataset.id}>
            <Paper className={classes.paper}>
              <DatasetDetail  dataset={dataset} project={project}/>
            </Paper>
            </Grid>
          ))}
          {chosenPkModels.map(pkModel => (
            <React.Fragment key={pkModel.id}>
            <Grid item xs={12}>
            <Paper className={classes.paper}>
              <PkDetail pk_model={pkModel} project={project} />
            </Paper>
            </Grid>
            { pkModel.protocol &&
            <Grid item xs={12}>
            <Paper className={classes.paper}>
              <ProtocolDetail protocol={pkModel.protocol} project={project} />
            </Paper>
            </Grid>
            }
          </React.Fragment>
          ))}
          {chosenPdModels.map(pdModel => (
            <Grid item xs={12} key={pdModel.id}>
            <Paper className={classes.paper}>
            <PdDetail project={project} pd_model={pdModel} />
            </Paper>
            </Grid>
          ))}
      </Grid>
    </div>
  )
}
