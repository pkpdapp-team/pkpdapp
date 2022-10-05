import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  useParams,
  useHistory,
} from "react-router-dom";

import PropTypes from "prop-types";
import Grid from "@material-ui/core/Grid";
import InferenceDetail from "./InferenceDetail";
import InferenceChart from "./InferenceChart";
import Paper from "@material-ui/core/Paper";
import Toolbar from '@material-ui/core/Toolbar';
import AccordionSummary from "@material-ui/core/AccordionSummary";
import Drawer from "@material-ui/core/Drawer";
import AccordionDetails from "@material-ui/core/AccordionDetails";
import CircularProgress from "@material-ui/core/CircularProgress";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import Typography from "@material-ui/core/Typography";
import Box from "@material-ui/core/Box";
import Inferences from "../inference/Inferences";
import List from "@material-ui/core/List";

import LinearProgressWithLabel from '../menu/LinearProgressWithLabel'

import { makeStyles } from "@material-ui/core/styles";


import { selectChosenProject, userHasReadOnlyAccess } from "../projects/projectsSlice.js";

import { selectChosenInferences, fetchInferences, selectInferenceById } from "./inferenceSlice.js";

import ExpandableListItem from "../menu/ExpandableListItem"

const drawerWidth = 200;

const useStyles = makeStyles((theme) => ({
  root: {
    marginTop: theme.spacing(2),
    flexGrow: 1,
  },
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
  linearProgress: {
    marginLeft: "auto",
    marginRight: theme.spacing(2),
    width: "70%",
    alignItems: "center",
  },
  paper: {
    padding: theme.spacing(2),
  },
}));




export default function Inference({project}) {
  let { id } = useParams();
  const inference = useSelector((state) => selectInferenceById(state, id));
  const classes = useStyles();
  const dispatch = useDispatch();

  if (!inference) {
    return (<CircularProgress />)
  }

  const progress = (100 * inference.number_of_iterations) /
              inference.max_number_of_iterations;

  return (
    <Paper className={classes.paper}>
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <div className={classes.linearProgress}>
          <LinearProgressWithLabel value={progress} />
        </div>
        <InferenceChart inference={inference} />
      </Grid>
      <Grid item xs={12} md={6} >
        <InferenceDetail inference={inference} project={project} />
      </Grid>
    </Grid>
    </Paper>
  );
}

