import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import Paper from "@mui/material/Paper";
import Grid from "@mui/material/Grid";
import Table from '@mui/material/Table';
import { useHistory, useParams } from "react-router-dom";
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import LinearProgress from "@mui/material/LinearProgress";
import TableBody from '@mui/material/TableBody';
import ProjectDetail from "../projects/ProjectDetail";
import Tooltip from "@mui/material/Tooltip";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
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
                  <IconButton aria-label="delete" onClick={handleDelete(item.id)} size="large">
                  <DeleteIcon/>
                  </IconButton>
                </Tooltip>
                </TableCell>
              </TableRow> 
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
    <Tooltip title="Create new item">
      <IconButton aria-label="add" onClick={handleNewRow} size="large">
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

