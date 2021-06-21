import React from "react";
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';
import PkDetail from './PkDetail'
import PkpdDetail from './PkDetail'
import PdDetail from './PdDetail'
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
    textAlign: 'center',
    color: theme.palette.text.secondary,
  },
}));

export default function Modelling({selected, selectedItems, project}) {
  const classes = useStyles();
  console.log(selected);
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
        <Grid item xs={12}>
          <Paper className={classes.paper}>
            {selectedIsDataset &&
            <DatasetDetail />
            }
            {selectedIsPkModel &&
            <PkDetail />
            }
            {selectedIsPdModel &&
            <PdDetail />
            }
            {selectedIsPkpdModel &&
            <PkpdDetail />
            }
          </Paper>
        </Grid>
      </Grid>
    </div>
  )
}
