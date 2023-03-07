import React from "react";
import { useDispatch, useSelector } from "react-redux";
import Paper from "@mui/material/Paper";
import Grid from "@mui/material/Grid";
import PkDetail from "../pkModels/PkDetail";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import PdDetail from "../pdModels/PdDetail";
import Toolbar from '@mui/material/Toolbar';
import ProtocolDetail from "../protocols/ProtocolDetail";
import DatasetDetail from "../datasets/DatasetDetail";
import Chart from "./Chart";
import Drawer from "@mui/material/Drawer";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Typography from "@mui/material/Typography";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";

import makeStyles from '@mui/styles/makeStyles';

import Header from "../modelling/Header";
import Footer from "../modelling/Footer";
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
    maxHeight: '90vh', overflow: 'auto'
  },
  chart: {
    height: "50vh",
    width: "100%",
  },
  protocolChart: {
    height: "40vh",
    width: "100%",
    marginTop: theme.spacing(2),
  },
  mmt_box: {
    width: "100%",
    padding: theme.spacing(2),
    maxHeight: '23vh', overflow: 'auto'
  },
  mmt: {
    whiteSpace: 'pre-wrap'
  },
}));

function Mmt({ item, project }) {
  const classes = useStyles();
  console.log('mmt', item.mmt)
  return (
    <Paper>
      <Header title="Model source" />
        <Box className={classes.mmt_box}>
          <Typography className={classes.mmt} display="block">
            {item.mmt}
          </Typography>
        </Box>
      <Footer
        buttons={[]}
      />
    </Paper>
  )
}

function ModellingMenu({ project }) {
  const readOnly = useSelector((state) => userHasReadOnlyAccess(state, project));
  const disableSave = project ? readOnly : true;
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
  if (type === 'dataset') {
    itemDetail = (
      <DatasetDetail dataset={item} project={project} />
    )
  } else if (type === 'pk_model') {
    itemDetail = (
      <PkDetail pk_model={item} project={project} />
    )
  } else if (type === 'pd_model') {
    itemDetail = (
      <PdDetail pd_model={item} project={project} />
    )
  } else if (type === 'protocol') {
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

function SelectedItemSecondary({ project }) {
  const id = useSelector((state) => state.modelling.selectedId);
  const type = useSelector((state) => state.modelling.selectedType);
  let selector = null;
  
  if (type === 'pk_model') {
    selector = selectPkModelById
  }
  if (type === 'pd_model') {
    selector = selectPdModelById
  }
  const item = useSelector((state) => selector ? selector(state, id) : null)

  if (type !== 'pk_model' && type !== 'pd_model' ) {
    return (null)
  }
  
  if (type && !item) {
    return (
      <CircularProgress />
    )
  }
  let itemDetail = null
  if (type === 'pk_model') {
    itemDetail = (
      <Mmt item={item} project={project} />
    )
  } else if (type === 'pd_model') {
    itemDetail = (
      <Mmt item={item} project={project} />
    )
  } else {
    itemDetail = (null)
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
            <ModellingChart/>
        </Paper>
      </Grid>
    </Grid>
    </div>
  </div>
  );
}
