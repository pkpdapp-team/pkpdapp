import React from "react";
import { useSelector } from "react-redux";
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

import { selectChosenDatasets, selectChosenDatasetProtocols } from "../datasets/datasetsSlice.js";

import { selectChosenPdModels } from "../pdModels/pdModelsSlice.js";

import { selectChosenPkModels } from "../pkModels/pkModelsSlice.js";

import { selectChosenProtocols } from "../protocols/protocolsSlice.js";

import Datasets from "../datasets/Datasets";
import PkModels from "../pkModels/PkModels";
import PdModels from "../pdModels/PdModels";
import Protocols from "../protocols/Protocols";
import DatasetProtocols from "../protocols/DatasetProtocols";

const drawerWidth = 300;

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
  chartPaper: {
    padding: theme.spacing(2),
  },
  chart: {
    height: "85vh",
    width: "100%",
  },
}));

function ModellingMenu({ project }) {
  const disableSave = project ? userHasReadOnlyAccess(project) : true;

  return (
      <List>
        <Datasets project={project} disableSave={disableSave} />
        <PdModels project={project} disableSave={disableSave} />
        <PkModels project={project} disableSave={disableSave} />
        <Protocols project={project} disableSave={disableSave} />
        <DatasetProtocols project={project} disableSave={disableSave} />
      </List>
  );
}

export default function Modelling({project}) {
  const classes = useStyles();
  const chosenDatasets = useSelector(selectChosenDatasets);
  const chosenPkModels = useSelector(selectChosenPkModels);
  const chosenPdModels = useSelector(selectChosenPdModels);
  const chosenProtocols = useSelector(selectChosenProtocols);
  const chosenDatasetProtocols = useSelector(selectChosenDatasetProtocols);
  let showChart = true;
  if (
    chosenDatasets.length === 0 &&
    chosenPkModels.length === 0 &&
    chosenPdModels.length === 0
  ) {
    showChart = false;
  }

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
      <Grid item xs={12} md={6}>
        <Paper className={classes.chartPaper}>
          {showChart && (

            <Chart
              className={classes.chart}
              datasets={chosenDatasets}
              pkModels={chosenPkModels}
              pdModels={chosenPdModels}
            />
          )}
          {!showChart && (
            <Typography>Choose a dataset or model to visualise</Typography>
          )}
        </Paper>
      </Grid>
      <Grid item xs={12} md={6}>
        {chosenDatasets.map((dataset) => {
          const loading = dataset.status
            ? dataset.status === "loading"
            : false;
          const expandIcon = loading ? (
            <CircularProgress size={20} />
          ) : (
            <ExpandMoreIcon />
          );
          return (
            <Accordion key={dataset.id}>
              <AccordionSummary expandIcon={expandIcon}>
                <Typography className={classes.heading}>
                  Dataset - {dataset.name}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {!loading && (
                  <DatasetDetail dataset={dataset} project={project} />
                )}
              </AccordionDetails>
            </Accordion>
          );
        })}
        {chosenPdModels.map((pdModel) => {
          const loading = pdModel.status
            ? pdModel.status === "loading"
            : false;
          const simulateLoading = pdModel.simulate
            ? pdModel.simulate.status === "loading"
            : true;
          const expandIcon =
            loading | simulateLoading ? (
              <CircularProgress size={20} />
            ) : (
              <ExpandMoreIcon />
            );

          return (
            <Accordion key={pdModel.id}>
              <AccordionSummary expandIcon={expandIcon}>
                <Typography className={classes.heading}>
                  PD Model - {pdModel.name}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {!loading && (
                  <PdDetail project={project} pd_model={pdModel} />
                )}
              </AccordionDetails>
            </Accordion>
          );
        })}
        {chosenPkModels.map((pkModel) => {
          const loading = pkModel.status
            ? pkModel.status === "loading"
            : false;
          const simulateLoading = pkModel.simulate
            ? pkModel.simulate.status === "loading"
            : true;
          const expandIcon =
            loading | simulateLoading ? (
              <CircularProgress size={20} />
            ) : (
              <ExpandMoreIcon />
            );

          return (
            <Accordion key={pkModel.id}>
              <AccordionSummary expandIcon={expandIcon}>
                <Typography className={classes.heading}>
                  PKPD Model - {pkModel.name}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {!loading && (
                  <PkDetail project={project} pk_model={pkModel} />
                )}
              </AccordionDetails>
            </Accordion>
          );
        })}
        {chosenProtocols.concat(chosenDatasetProtocols).map((protocol) => (
          <Accordion key={protocol.id}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography className={classes.heading}>
                Protocol - {protocol.name}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <ProtocolDetail protocol={protocol} project={project} />
            </AccordionDetails>
          </Accordion>
        ))}
      </Grid>
    </Grid>
    </div>
  </div>
  );
}
