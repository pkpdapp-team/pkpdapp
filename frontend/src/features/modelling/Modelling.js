import React from "react";
import { useDispatch, useSelector } from "react-redux";
import Paper from "@material-ui/core/Paper";
import Grid from "@material-ui/core/Grid";
import PkDetail from "../pkModels/PkDetail";
import AccountTreeIcon from "@material-ui/icons/AccountTree";
import PdDetail from "../pdModels/PdDetail";
import Toolbar from '@material-ui/core/Toolbar';
import ProtocolDetail from "../protocols/ProtocolDetail";
import DatasetDetail from "../datasets/DatasetDetail";
import Chart from "./Chart";
import Drawer from "@material-ui/core/Drawer";
import Accordion from "@material-ui/core/Accordion";
import AccordionSummary from "@material-ui/core/AccordionSummary";
import AccordionDetails from "@material-ui/core/AccordionDetails";
import CircularProgress from "@material-ui/core/CircularProgress";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import Typography from "@material-ui/core/Typography";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";

import { makeStyles } from "@material-ui/core/styles";

import { selectChosenProject, userHasReadOnlyAccess } from "../projects/projectsSlice.js";

import { selectChosenDatasets, selectChosenDatasetProtocols, selectDatasetById } from "../datasets/datasetsSlice.js";

import { selectChosenPdModels, selectPdModelById } from "../pdModels/pdModelsSlice.js";

import { selectChosenPkModels, selectPkModelById } from "../pkModels/pkModelsSlice.js";

import { selectChosenProtocols, selectProtocolById } from "../protocols/protocolsSlice.js";

import { clearSelectItem } from "./modellingSlice"

import DatasetProtocols from "../protocols/DatasetProtocols";
import ProjectDetail from "../projects/ProjectDetail";
import ExpandableListItem from "../menu/ExpandableListItem";

const drawerWidth = 250;

const useStyles = makeStyles((theme) => ({
  drawer: {
    width: drawerWidth,
    flexShrink: 0,
    '& .MuiDrawer-paper': {
      width: drawerWidth,
      boxSizing: 'border-box',
    },
  },
  main: {
    marginLeft: drawerWidth,
    flexGrow: 1,
  },
  paperChart: {
    padding: theme.spacing(2),
  },
  chart: {
    height: "50vh",
    width: "100%",
  },
}));

function ModellingMenu({ project }) {
  const disableSave = project ? userHasReadOnlyAccess(project) : true;
  const dispatch = useDispatch();
  const handleProjectClick = () => dispatch(clearSelectItem());
  return (
      <List>
        <ListItem button onClick={handleProjectClick}>
        <ListItemIcon>
          <AccountTreeIcon />
        </ListItemIcon>
        <ListItemText primary={'Project'} />
        </ListItem>
        <ExpandableListItem type={'dataset'} text={'Datasets'} project={project} disableSave={disableSave} />
        <ExpandableListItem type={'pd_model'} text={'PD Models'} project={project} disableSave={disableSave} />
        <ExpandableListItem type={'pk_model'} text={'PK Models'} project={project} disableSave={disableSave} />
        <ExpandableListItem type={'protocol'} text={'Protocols'} project={project} disableSave={disableSave} />
      </List>
  );
}

function ModellingChart({ project }) {
  const classes = useStyles();
  const chosenDatasets = useSelector(selectChosenDatasets);
  const chosenPkModels = useSelector(selectChosenPkModels);
  const chosenPdModels = useSelector(selectChosenPdModels);
  const chosenDatasetProtocols = useSelector(selectChosenDatasetProtocols);

  let showChart = true;
  if (
    !chosenDatasets ||
    !chosenPkModels ||
    !chosenPdModels
  ) {
    showChart = false;
  }
  if (
    chosenDatasets.length === 0 &&
    chosenPkModels.length === 0 &&
    chosenPdModels.length === 0
  ) {
    showChart = false;
  }

  if (!showChart) {
    return (
      <Typography>Choose a dataset or model to visualise</Typography>
    )
  }

  console.log('Chosendatasets', chosenDatasets)
  console.log('chosenPkModels', chosenPkModels)
  console.log('chosenPdModels', chosenPdModels)

  return (
    <Chart
      className={classes.chart}
      datasets={chosenDatasets}
      pkModels={chosenPkModels}
      pdModels={chosenPdModels}
    />
  );
}

function SelectedItem({ project }) {
  const id = useSelector((state) => state.modelling.selectedId);
  const type = useSelector((state) => state.modelling.selectedType);
  let selector = null;
  if (type == 'dataset') {
    selector = selectDatasetById
  }
  if (type == 'pk_model') {
    selector = selectPkModelById
  }
  if (type == 'pd_model') {
    selector = selectPdModelById
  }
  if (type == 'protocol') {
    selector = selectProtocolById
  }
  const item = useSelector((state) => selector ? selector(state, id) : null)
  
  if (type && !item) {
    return (
      <CircularProgress />
    )
  }
  let itemDetail = null
  if (type == 'dataset') {
    itemDetail = (
      <DatasetDetail dataset={item} project={project} />
    )
  } else if (type == 'pk_model') {
    itemDetail = (
      <PkDetail pk_model={item} project={project} />
    )
  } else if (type == 'pd_model') {
    itemDetail = (
      <PdDetail pd_model={item} project={project} />
    )
  } else if (type == 'protocol') {
    itemDetail = (
      <ProtocolDetail protocol={item} project={project} />
    )
  } else {
    itemDetail = (
      <ProjectDetail project={project} />
    )
  }
  return itemDetail;
}

export default function Modelling({project}) {
  const classes = useStyles();
  return (
    <div className={classes.root}>
    <Drawer
        className={classes.drawer}
        variant="permanent"
        anchor="left"
    >
      <Toolbar />
      <ModellingMenu project={project} />
    </Drawer>
    <div className={classes.main}>
    <Grid container spacing={1}>
      <Grid item xs={12} md={6} >
        <SelectedItem  project={project}/>
      </Grid>
      <Grid item xs={12} md={6}>
        <Paper className={classes.paperChart}>
            <ModellingChart
              className={classes.chart}
            />
        </Paper>
      </Grid>
      
    </Grid>
    </div>
  </div>
  );
}
