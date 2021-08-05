import React from "react";
import { useSelector } from 'react-redux'
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';
import ProjectDetail from '../projects/ProjectDetail'

import { makeStyles } from '@material-ui/core/styles';

import {
  selectAllProjects, 
} from '../projects/projectsSlice.js'

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
  
  const projects = useSelector(selectAllProjects);
  console.log(projects)
  return (
    <div className={classes.root}>
      <Grid container spacing={3}>
        {projects.map(project => (
          <Grid item xs={12}>
            <Paper className={classes.paper}>
              <ProjectDetail project={project}/>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </div>
  )
}
