import React from "react";
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';
import PkDetail from './PkDetail'
import PkpdDetail from './PkDetail'
import PdDetail from './PdDetail'
import ProtocolDetail from './ProtocolDetail'
import DatasetDetail from './DatasetDetail'
import Chart from './Chart'
import ChartController from './ChartController'

import { makeStyles } from '@material-ui/core/styles';


const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
  },
  paper: {
    padding: theme.spacing(2),
    textAlign: 'left',
  },
}));

export default function Modelling({selected, selectedItems, project}) {
  const classes = useStyles();
  if (!project) {
    return ('Select a project')
  }
  if (!selected) {
    return ('Select something')
  }
  console.log('Modelling', selected);
  const selectedIsDataset = selected ? selected.type === 'dataset' : false;
  console.log(selected);
  const selectedIsPkModel= selected ? selected.type === 'pk_model' : false;
  const selectedIsPdModel= selected ? selected.type === 'pd_model' : false;
  const selectedIsPkpdModel= selected ? selected.type === 'pkpd_model' : false;
  return (
    <div className={classes.root}>
      <Grid container spacing={3}>
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
        {selectedIsDataset &&
        <Grid item xs={12}>
        <Paper className={classes.paper}>
          <DatasetDetail  project={project} dataset={selected} />
        </Paper>
        </Grid>
        }
        {selectedIsPkModel &&
        <React.Fragment>
        <Grid item xs={12}>
        <Paper className={classes.paper}>
          <PkDetail project={project} pk_model={selected} />
        </Paper>
        </Grid>

          { selected.protocol &&
          <Grid item xs={12}>
          <Paper className={classes.paper}>
            <ProtocolDetail project={project} protocol={selected.protocol} />
          </Paper>
          </Grid>
          }
        </React.Fragment>
        }
        {selectedIsPdModel &&
        <Grid item xs={12}>
        <Paper className={classes.paper}>
        <PdDetail project={project} pd_model={selected} />
        </Paper>
        </Grid>
        }
        {selectedIsPkpdModel &&
        <Paper className={classes.paper}>
        <PkpdDetail />
        </Paper>
        }
      </Grid>
    </div>
  )
}
