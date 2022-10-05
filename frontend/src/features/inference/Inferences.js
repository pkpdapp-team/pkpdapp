import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import Paper from "@material-ui/core/Paper";
import Grid from "@material-ui/core/Grid";
import Table from '@material-ui/core/Table';
import { useHistory, useParams } from "react-router-dom";
import Typography from '@material-ui/core/Typography';
import Container from '@material-ui/core/Container';
import LinearProgress from "@material-ui/core/LinearProgress";
import TableBody from '@material-ui/core/TableBody';
import ProjectDetail from "../projects/ProjectDetail";
import Tooltip from "@material-ui/core/Tooltip";
import { useTheme } from "@material-ui/core/styles";
import Box from "@material-ui/core/Box";
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

import LinearProgressWithLabel from '../menu/LinearProgressWithLabel'
import InferenceDialog from './InferenceDialog'

import {
  addNewInference,
  selectAllInferences,
  deleteInference,
} from "./inferenceSlice.js";

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



export default function Inferences({ project }) {
  const classes = useStyles();
  const theme = useTheme();
  const dispatch = useDispatch();
  const history = useHistory();

  const [openDialog, setOpenDialog] = React.useState(false);
  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleNewRow = () => {
    setOpenDialog(true);
  };
  const items = useSelector(selectAllInferences);

  const handleRowClick = (item) => {
     history.push(`/${project.id}/inference/${item.id}/`);
  }

  const handleDelete = (id) => (event) => {
    event.stopPropagation()
    dispatch(deleteInference(id));
  }

  const column_headings = [
    {label: 'Name', help: 'Name'},
    {label: 'Description', help: 'Description'},
    {label: 'Progress', help: 'Progress'},
    {label: 'Actions', help: 'Click icon to perform actions'},
  ]

  return (
    <Paper className={classes.paper}>
    <Typography variant="h5">
      My Inferences
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
          {items.map((item) => {
            const progress =
              (100 * item.number_of_iterations) /
              item.max_number_of_iterations;
            return (
              <React.Fragment key={item.id}>
              <TableRow hover onClick={() => handleRowClick(item)}>
                <TableCell>
                  {item.name}
                </TableCell>
                <TableCell>
                  {item.description}
                </TableCell>
                <TableCell>
                  <LinearProgressWithLabel value={progress} />
                </TableCell>

                <TableCell>
                <Tooltip title="delete item">
                  <IconButton aria-label="delete" onClick={handleDelete(item.id)}>
                  <DeleteIcon/>
                  </IconButton>
                </Tooltip>
                </TableCell>
              </TableRow> 
              </React.Fragment>
          )
          })}
        </TableBody>
      </Table>
    </TableContainer>
    <Tooltip title="Create new item">
      <IconButton aria-label="add" onClick={handleNewRow}>
      <AddIcon/>
    </IconButton>
    </Tooltip>
    <InferenceDialog 
      open={openDialog}
      handleCloseDialog={handleCloseDialog}
      project={project}
    />
    </Paper>
  );
}

