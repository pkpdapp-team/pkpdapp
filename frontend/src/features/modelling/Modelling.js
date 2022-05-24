import React from "react";
import { useSelector } from "react-redux";
import Paper from "@material-ui/core/Paper";
import Grid from "@material-ui/core/Grid";
import PkDetail from "../pkModels/PkDetail";
import PkpdDetail from "../pkpdModels/PkpdDetail";
import PdDetail from "../pdModels/PdDetail";
import ProtocolDetail from "../protocols/ProtocolDetail";
import DatasetDetail from "../datasets/DatasetDetail";
import Chart from "./Chart";
import Accordion from "@material-ui/core/Accordion";
import AccordionSummary from "@material-ui/core/AccordionSummary";
import AccordionDetails from "@material-ui/core/AccordionDetails";
import CircularProgress from "@material-ui/core/CircularProgress";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import Typography from "@material-ui/core/Typography";

import { makeStyles } from "@material-ui/core/styles";

import { selectChosenProject } from "../projects/projectsSlice.js";

import { selectChosenDatasets, selectChosenDatasetProtocols } from "../datasets/datasetsSlice.js";

import { selectChosenPdModels } from "../pdModels/pdModelsSlice.js";

import { selectChosenPkModels } from "../pkModels/pkModelsSlice.js";

import { selectChosenPkpdModels } from "../pkpdModels/pkpdModelsSlice.js";

import { selectChosenProtocols } from "../protocols/protocolsSlice.js";

const useStyles = makeStyles((theme) => ({
  root: {
    marginTop: theme.spacing(2),
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

export default function Modelling() {
  const classes = useStyles();
  const project = useSelector(selectChosenProject);
  const chosenDatasets = useSelector(selectChosenDatasets);
  const chosenPkModels = useSelector(selectChosenPkModels);
  const chosenPkpdModels = useSelector(selectChosenPkpdModels);
  const chosenPdModels = useSelector(selectChosenPdModels);
  const chosenProtocols = useSelector(selectChosenProtocols);
  const chosenDatasetProtocols = useSelector(selectChosenDatasetProtocols);
  if (!project) {
    return "Select a project";
  }
  let showChart = true;
  if (
    chosenDatasets.length === 0 &&
    chosenPkModels.length === 0 &&
    chosenPkpdModels.length === 0 &&
    chosenPdModels.length === 0
  ) {
    showChart = false;
  }

  return (
    <div className={classes.root}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper className={classes.chartPaper}>
            {showChart && (

              <Chart
                className={classes.chart}
                datasets={chosenDatasets}
                pkpdModels={chosenPkpdModels}
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
                    PK Model - {pkModel.name}
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
          {chosenPkpdModels.map((pkpdModel) => {
            const loading = pkpdModel.status
              ? pkpdModel.status === "loading"
              : false;
            const simulateLoading = pkpdModel.simulate
              ? pkpdModel.simulate.status === "loading"
              : true;
            const expandIcon =
              loading | simulateLoading ? (
                <CircularProgress size={20} />
              ) : (
                <ExpandMoreIcon />
              );

            return (
              <Accordion key={pkpdModel.id}>
                <AccordionSummary expandIcon={expandIcon}>
                  <Typography className={classes.heading}>
                    PKPD Model - {pkpdModel.name}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {!loading && (
                    <PkpdDetail project={project} pkpd_model={pkpdModel} />
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
  );
}
