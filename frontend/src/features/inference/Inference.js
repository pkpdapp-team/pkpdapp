import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
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
import LinearProgress from "@material-ui/core/LinearProgress";
import Box from "@material-ui/core/Box";
import Inferences from "../inference/Inferences";
import List from "@material-ui/core/List";

import { makeStyles } from "@material-ui/core/styles";

import { selectChosenProject, userHasReadOnlyAccess } from "../projects/projectsSlice.js";

import { selectChosenInferences, fetchInferences } from "./inferenceSlice.js";

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

function InferenceMenu({ project }) {
  console.log("got project", project);

  const disableSave = project ? userHasReadOnlyAccess(project) : true;

  const projectName = project ? project.name : "None";

  return (
    <List>
      <Inferences project={project} disableSave={disableSave} />
    </List>
  );
}

function LinearProgressWithLabel(props) {
  return (
    <Box display="flex" alignItems="center">
      <Typography
        variant="body2"
        color="textSecondary"
      >{`${props.value}%`}</Typography>
      <Box width="100%" ml={1}>
        <LinearProgress variant="determinate" value={props.value} />
      </Box>
    </Box>
  );
}

LinearProgressWithLabel.propTypes = {
  /**
   * The value of the progress indicator for the determinate and buffer variants.
   * Value between 0 and 100.
   */
  value: PropTypes.number.isRequired,
};

export default function Inference({ project }) {
  const dispatch = useDispatch();
  const classes = useStyles();
  const chosenInferences = useSelector(selectChosenInferences);

  useEffect(() => {
    const interval = setInterval(() => {
      dispatch(fetchInferences(project.id));
    }, 100000);
    return () => {
      clearInterval(interval);
    };
  }, [project]);

  return (
    <div className={classes.root}>
    <Drawer
        className={classes.drawer}
        variant="permanent"
        anchor="left"
    >
      <Toolbar />
      <InferenceMenu project={project} />
    </Drawer>
    <div className={classes.main}>
      {chosenInferences.map((inference) => {
        const loading = inference.status
          ? inference.status === "loading"
          : false;
        const title = inference.read_only ? "Inference" : "Draft Inference";
        const expandIcon = loading ? (
          <CircularProgress size={20} />
        ) : (
          <ExpandMoreIcon />
        );
        const progress =
          (100 * inference.number_of_iterations) /
          inference.max_number_of_iterations;
        return (
          <Paper key={inference.id} className={classes.paper}>
              <Typography variant="h6">
                {title} - {inference.name}
              </Typography>
              
              {!loading && (
                <Grid container spacing={3}>
                  { inference.read_only &&
                  <Grid item xs={12} md={6}>
                    <div className={classes.linearProgress}>
                      <LinearProgressWithLabel value={progress} />
                    </div>
                    <InferenceChart inference={inference} />
                  </Grid>
                  }
                  <Grid item xs={12} md={inference.read_only ? 6 : 12}>
                    <InferenceDetail inference={inference} project={project} />
                  </Grid>
                </Grid>
              )}
          </Paper>
        );
      })}
    </div>
    </div>
  );
}
