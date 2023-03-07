import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import { useForm, useFieldArray } from "react-hook-form";
import makeStyles from '@mui/styles/makeStyles';
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

import { selectUnitById } from "../projects/unitsSlice";
import { FormTextField, FormSelectField } from "../forms/FormComponents";
import SubjectSubform from "./SubjectSubform";

import { userHasReadOnlyAccess } from "../projects/projectsSlice";

import { updateProtocol, deleteProtocol } from "../protocols/protocolsSlice.js";
import { selectSubjectsByDataset } from "../datasets/subjectsSlice";

const useStyles = makeStyles((theme) => ({
  table: {
    width: "100%",
  },
  tableCell: {
    width: "100pt",
  },
  controls: {
    display: "flex",
    alignItems: "center",
    paddingLeft: theme.spacing(1),
    paddingBottom: theme.spacing(1),
    "& > *": {
      margin: theme.spacing(1),
    },
  },
}));


export default function SubjectsTable ({ dataset, disableSave }) {

  const classes = useStyles();
  const subjects = useSelector((state) => selectSubjectsByDataset(state, dataset));

  return (
    <React.Fragment>
    <Typography>Subjects</Typography>
    <TableContainer component={Paper} variant="outlined">
      <Table className={classes.table} size="small">
        <TableHead>
          <TableRow>
              <TableCell >Id</TableCell>
              <TableCell>Protocol</TableCell>
              <TableCell>Display</TableCell>
              <TableCell>Shape</TableCell>
              <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {subjects.map((subject, index) => (
            <SubjectSubform
              key={index}
              dataset={dataset}
              subject={subject}
              disableSave={disableSave}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
    </React.Fragment>
  )
}
 
