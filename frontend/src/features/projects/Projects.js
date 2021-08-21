import React, { useEffect } from "react";
import { useSelector } from 'react-redux'
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';
import ProjectDetail from '../projects/ProjectDetail'
import { useTheme } from '@material-ui/core/styles';
import { useDispatch } from 'react-redux'

import { makeStyles } from '@material-ui/core/styles';

import {
  fetchProjects,
} from './projectsSlice.js'

import {
  fetchUsers,
} from './usersSlice.js'

import {
  fetchUnits,
} from './unitsSlice.js'


import {
  selectAllProjects, selectChosenProject
} from './projectsSlice.js'

const useStyles = makeStyles((theme) => ({
  root: {
    marginTop: theme.spacing(2),
    flexGrow: 1,
  },
  paper: {
    padding: theme.spacing(2),
    textAlign: 'left',
  },
}));


export default function Projects() {
  const classes = useStyles();
  const theme = useTheme();
  const dispatch = useDispatch()

  useEffect(() => {
    console.log('dispatch fetchProjects')
    dispatch(fetchProjects())
    dispatch(fetchUsers())
    dispatch(fetchUnits())
    //const interval = setInterval(() => {
    //  refreshHarvesters();
    //}, 5000);
    //return () => clearInterval(interval);
  }, [dispatch]);
  
  const projects = useSelector(selectAllProjects);
  const chosenProject = useSelector(selectChosenProject);
  console.log(projects)
  return (
    <div className={classes.root}>
      <Grid container spacing={3}>
        {projects.map(project => (
          <Grid item xs={12} key={project.id}>
            <Paper className={classes.paper}
              style={{'backgroundColor': ((project === chosenProject) ? theme.palette.primary.light: theme.palette.background.paper) }}
            >
              <ProjectDetail project={project}/>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </div>
  )
}
