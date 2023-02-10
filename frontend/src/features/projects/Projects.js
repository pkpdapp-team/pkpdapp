import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import Paper from "@material-ui/core/Paper";
import Grid from "@material-ui/core/Grid";
import Table from '@material-ui/core/Table';
import { useHistory } from "react-router-dom";
import Typography from '@material-ui/core/Typography';
import Container from '@material-ui/core/Container';
import TableBody from '@material-ui/core/TableBody';
import ProjectDetail from "../projects/ProjectDetail";
import Tooltip from "@material-ui/core/Tooltip";
import { useTheme } from "@material-ui/core/styles";
import { useDispatch } from "react-redux";
import TableCell from '@material-ui/core/TableCell';
import SaveIcon from '@material-ui/icons/Save';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import DeleteIcon from '@material-ui/icons/Delete';
import TableRow from '@material-ui/core/TableRow';

import AddIcon from "@material-ui/icons/Add";

import IconButton from "@material-ui/core/IconButton";
import { makeStyles } from "@material-ui/core/styles";





import {
  selectMyProjects,
  selectChosenProject,
  addNewProject,
  deleteProject,
} from "./projectsSlice.js";

const useStyles = makeStyles((theme) => ({
  container: {
  },
  paper: {
    padding: theme.spacing(2),
    textAlign: "left",
  },
  controlsRoot: {
    display: "flex",
    alignItems: "center",
  },
  controls: {
    margin: theme.spacing(1),
  },
}));

export default function Projects() {
  const classes = useStyles();
  const theme = useTheme();
  const dispatch = useDispatch();
  const history = useHistory();

  

  const handleNewProject = () => {
    dispatch(addNewProject());
  };

  const projects = useSelector(selectMyProjects);

  const handleRowClick = (project) => {
     history.push(`/${project.id}/`);
  }

  const handleDelete = (id) => (event) => {
    event.stopPropagation()
    dispatch(deleteProject(id));
  }

  const column_headings = [
    {label: 'Name', help: 'Project Name'},
    {label: 'Description', help: 'Description'},
    {label: 'Actions', help: 'Click icon to perform actions'},
  ]

  return (
    <Paper className={classes.paper}>
    <Typography variant="h5">
      My Projects 
    </Typography>
    <TableContainer>
      <Table className={classes.table} size="small" >
        <TableHead>
          <TableRow >
            {column_headings.map(heading => (
            <TableCell key={heading.label}>
              <Tooltip title={heading.help}>
                <Typography>
                  {heading.label}
                </Typography>
              </Tooltip>
            </TableCell>
            ))
            }
          </TableRow>
        </TableHead>
        <TableBody>
          {projects.map((project) => (
            <React.Fragment key={project.id}>
            <TableRow hover onClick={() => handleRowClick(project)}>
              <TableCell>
                {project.name}
              </TableCell>
              <TableCell>
                {project.description}
              </TableCell>

              <TableCell>
              <Tooltip title="delete project">
                <IconButton aria-label="delete" onClick={handleDelete(project.id)}>
                <DeleteIcon/>
                </IconButton>
              </Tooltip>
              </TableCell>
            </TableRow> 
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
    <Tooltip title="Create new project">
      <IconButton aria-label="add" onClick={handleNewProject}>
      <AddIcon/>
    </IconButton>
    </Tooltip>
    </Paper>
  );
}
