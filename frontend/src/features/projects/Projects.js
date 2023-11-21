import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import Paper from "@mui/material/Paper";
import Grid from "@mui/material/Grid";
import Table from '@mui/material/Table';
import { useHistory } from "react-router-dom";
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import TableBody from '@mui/material/TableBody';
import ProjectDetail from "../projects/ProjectDetail";
import Tooltip from "@mui/material/Tooltip";
import { useTheme } from "@mui/material/styles";
import { useDispatch } from "react-redux";
import TableCell from '@mui/material/TableCell';
import SaveIcon from '@mui/icons-material/Save';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import DeleteIcon from '@mui/icons-material/Delete';
import TableRow from '@mui/material/TableRow';

import AddIcon from "@mui/icons-material/Add";

import IconButton from "@mui/material/IconButton";
import makeStyles from '@mui/styles/makeStyles';





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
                <IconButton aria-label="delete" onClick={handleDelete(project.id)} size="large">
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
      <IconButton aria-label="add" onClick={handleNewProject} size="large">
      <AddIcon/>
    </IconButton>
    </Tooltip>
    </Paper>
  );
}
