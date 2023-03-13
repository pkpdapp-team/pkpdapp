import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  useParams,
  useHistory,
} from "react-router-dom";

import PropTypes from "prop-types";
import Grid from "@mui/material/Grid";
import InferenceDetail from "./InferenceDetail";
import InferenceChart from "./InferenceChart";
import Paper from "@mui/material/Paper";
import Toolbar from '@mui/material/Toolbar';
import AccordionSummary from "@mui/material/AccordionSummary";
import Drawer from "@mui/material/Drawer";
import AccordionDetails from "@mui/material/AccordionDetails";
import CircularProgress from "@mui/material/CircularProgress";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Inferences from "../inference/Inferences";
import List from "@mui/material/List";
import Stack from "@mui/material/Stack";

import LinearProgressWithLabel from '../menu/LinearProgressWithLabel'

import makeStyles from '@mui/styles/makeStyles';


import { selectChosenProject, userHasReadOnlyAccess } from "../projects/projectsSlice.js";

import { selectChosenInferences, fetchInferences, selectInferenceById } from "./inferenceSlice.js";

import ExpandableListItem from "../menu/ExpandableListItem"

const drawerWidth = 200;

export default function Inference({project}) {
  let { id } = useParams();
  const inference = useSelector((state) => selectInferenceById(state, id));
  const dispatch = useDispatch();

  if (!inference) {
    return (<CircularProgress />)
  }

  const progress = (100 * inference.number_of_iterations) /
              inference.max_number_of_iterations;

  return (
    <Paper sx={{p: 1}}>
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Stack spacing={1}>
        <div 
          sx={{
            width: "75%"
          }}
        >
          <LinearProgressWithLabel sx={{width: "75%"}} value={progress} />
        </div>
        <InferenceChart inference={inference} />
        </Stack>
      </Grid>
      <Grid item xs={12} md={6} >
        <InferenceDetail inference={inference} project={project} />
      </Grid>
    </Grid>
    </Paper>
  );
}

