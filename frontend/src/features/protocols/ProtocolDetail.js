import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import { useForm, useFieldArray } from "react-hook-form";
import Box from "@mui/material/Box";
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
import Stack from "@mui/material/Stack"
import Grid from "@mui/material/Grid";

import Header from "../modelling/Header";
import Footer from "../modelling/Footer";

import { selectUnitById } from "../projects/unitsSlice";
import { FormTextField, FormSelectField } from "../forms/FormComponents";

import { userHasReadOnlyAccess } from "../projects/projectsSlice";

import { updateProtocol, deleteProtocol } from "../protocols/protocolsSlice.js";

const useStyles = makeStyles((theme) => ({
  root: {
    maxHeight: '75vh', overflow: 'auto',
    padding: theme.spacing(2),
  },
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

export default function ProtocolDetail({ project, protocol }) {
  const classes = useStyles();
  const dispatch = useDispatch();
  console.log("protocol", protocol);
  const { control, handleSubmit, reset } = useForm(protocol);
  const { fields, append, remove } = useFieldArray({
    control,
    name: "doses",
    keyName: "keyId",
  });

  useEffect(() => {
    reset(protocol);
  }, [reset, protocol]);

  const handleProtocolDelete = () => {
    dispatch(deleteProtocol(protocol.id));
  };

  const onSubmit = (values) => {
    dispatch(updateProtocol(values));
  };

  const amount_unit_id = protocol.amount_unit;
  let amount_unit = useSelector((state) =>
    selectUnitById(state, amount_unit_id)
  );
  if (!amount_unit) {
    amount_unit = {
      symbol: "X",
    };
  }
  const amount_unit_options = amount_unit.compatible_units.map((u) => {
    return { key: u.symbol, value: u.id };
  });

  const time_unit_id = protocol.time_unit;
  let time_unit = useSelector((state) => selectUnitById(state, time_unit_id));
  if (!time_unit) {
    time_unit = {
      symbol: "X",
    };
  }
  const time_unit_options = time_unit.compatible_units.map((u) => {
    return { key: u.symbol, value: u.id };
  });

  const dose_type_options = [
    { key: "IV", value: "D" },
    { key: "Extravascular", value: "I" },
  ];

  const dose_columns = [
    { title: "Start Time", field: "start_time" },
    { title: "Amount", field: "amount" },
    { title: "Duration", field: "duration" },
  ];

  let disableSave = useSelector(state => userHasReadOnlyAccess(state, project));
  disableSave = protocol.dataset || disableSave;


  return (
    <Paper sx={{maxHeight: '85vh', overflow: 'auto'}}>
    <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
      <Header title={`Protocol: ${protocol.name}`}/>
      <Grid container spacing={1} sx={{p: 1}}>
      <Grid item xs={12}>
      <FormTextField
        fullWidth
        control={control}
        defaultValue={protocol.name}
        name="name"
        label="Name"
      />
      </Grid>
      <Grid item xs={4}>
      <FormSelectField
        fullWidth
        control={control}
        options={dose_type_options}
        defaultValue={protocol.dose_type}
        name="dose_type"
        label="Dosing Type"
      />
      </Grid>
      <Grid item xs={4}>
      <FormSelectField
        fullWidth
        control={control}
        options={amount_unit_options}
        defaultValue={protocol.amount_unit}
        name="amount_unit"
        label="Amount Unit"
      />
      </Grid>
      <Grid item xs={4}>
      <FormSelectField
        fullWidth
        control={control}
        options={time_unit_options}
        defaultValue={protocol.time_unit}
        name="time_unit"
        label="Time Unit"
      />
      </Grid>
      <Grid item xs={12}>
      <Typography>Doses</Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table className={classes.table} size="small">
          <TableHead>
            <TableRow>
              <TableCell>Actions</TableCell>
              {dose_columns.map((col) => (
                <TableCell key={col.title}>{col.title}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {fields.map((dose, index) => (
              <TableRow key={dose.keyId}>
                <TableCell>
                  <IconButton size="small" onClick={() => remove(index)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
                {dose_columns.map((col) => (
                  <TableCell>
                    <FormTextField
                      className={classes.tableCell}
                      control={control}
                      defaultValue={dose[col.field]}
                      name={`doses[${index}].${col.field}`}
                      type="number"
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <IconButton
          aria-label="add"
          onClick={() =>
            append({ id: null, start_time: 0, amount: 0, duration: 1.0 })
          }
          size="large">
          <AddIcon />
        </IconButton>
      </TableContainer>
      </Grid>
      </Grid>
      <Footer
        buttons={[
          {label: 'Save', handle: handleSubmit(onSubmit)},
          {label: 'Delete', handle: handleProtocolDelete},
        ]}
      />
    </form>
    </Paper>
  );
}
