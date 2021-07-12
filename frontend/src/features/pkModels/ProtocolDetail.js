import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from 'react-redux'
import TextField from '@material-ui/core/TextField';
import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button';
import ArrowUpwardIcon from '@material-ui/icons/ArrowUpward';
import ArrowDownwardIcon from '@material-ui/icons/ArrowDownward';
import IconButton from '@material-ui/core/IconButton';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import { useForm, useFieldArray, Controller  } from "react-hook-form";
import { makeStyles } from '@material-ui/core/styles';
import DeleteIcon from '@material-ui/icons/Delete';
import AddIcon from '@material-ui/icons/Add';
import Typography from '@material-ui/core/Typography';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';

import {FormTextField, FormSelectField} from '../forms/FormComponents';

import {
  selectProtocolById, updateProtocol,
} from '../pkModels/protocolsSlice.js'

const useStyles = makeStyles((theme) => ({
  table: {
    width: '100%',
  },
  tableCell: {
    width: '100pt',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    paddingLeft: theme.spacing(1),
    paddingBottom: theme.spacing(1),
  },
}));

export default function ProtocolDetail({project, protocol_id}) {
  const classes = useStyles();
  const protocol = useSelector(state => selectProtocolById(state, protocol_id))
  const dispatch = useDispatch();
  console.log('protocol', protocol);
  const { control, handleSubmit, register, reset } = useForm(protocol);
  const { fields, append, remove, swap } = useFieldArray(
    {
      control,
      name: "doses",
      keyName: "keyId",
    }
  );

  useEffect(() => {
    reset(protocol);
  }, [reset, protocol]);

  const onSubmit = (values) => {
    dispatch(updateProtocol(values));
  };


  const dose_type_options = [
    {key: 'IV', value: 'D'},
    {key: 'Extravascular', value: 'I'}, 
  ]

  const dose_columns = [
    { title: "Start Time", field: "start_time" },
    { title: "Amount", field: "amount" },
    { title: "Duration", field: "duration" },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
      <Typography>Protocol</Typography>
      <FormTextField 
        control={control} 
        name="name" label="Name"
      />
      <FormSelectField 
        control={control} 
        options={dose_type_options}
        defaultValue={protocol.dose_type}
        name="dose_type" label="Dosing Type"
      />
      <Typography>Doses</Typography>
      <TableContainer component={Paper} variant='outlined'>
      <Table className={classes.table} size="small" >
        <TableHead>
          <TableRow>
            <TableCell>Actions</TableCell>
            {dose_columns.map(col => (
            <TableCell key={col.title}>{col.title}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {fields.map((dose, index) => (
            <TableRow key={dose.keyId}>
              <TableCell>
              <IconButton size='small'
                onClick={() => remove(index)}
              >
                <DeleteIcon />
              </IconButton>
              </TableCell>
              {dose_columns.map(col => (
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
      <IconButton aria-label="add" 
        onClick={() => append( 
          { id: null, start_time: 0, amount: 0, duration: 0 }
        )}>
        <AddIcon />
      </IconButton>
    </TableContainer>
      <Button 
        className={classes.controls} 
        variant="contained"
        type="submit" >
        Save
      </Button>
    </form>
  )
}
