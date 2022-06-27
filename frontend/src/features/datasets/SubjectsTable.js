import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";
import IconButton from "@material-ui/core/IconButton";
import { useForm, useFieldArray } from "react-hook-form";
import { makeStyles } from "@material-ui/core/styles";
import DeleteIcon from "@material-ui/icons/Delete";
import AddIcon from "@material-ui/icons/Add";
import Typography from "@material-ui/core/Typography";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";

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
  const groups = [...subjects.reduce((sum, subject) => {
    subject.groups.forEach(group => sum.add(group.name))
    return sum
  }, new Set()).values()]
  console.log('groups', groups)

  return (
    <React.Fragment>
    <Typography>Subjects</Typography>
    <TableContainer component={Paper} variant="outlined">
      <Table className={classes.table} size="small">
        <TableHead>
          <TableRow>
              <TableCell >Id</TableCell>
              {groups.map((col) => (
                <TableCell key={col}>{col}</TableCell>
              ))}
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
              groups={groups}
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
 
