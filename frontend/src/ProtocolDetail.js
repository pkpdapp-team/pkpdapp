import React, { useEffect, useState } from "react";
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
import {FormTextField, FormSelectField} from './FormComponents';
import DeleteIcon from '@material-ui/icons/Delete';
import AddIcon from '@material-ui/icons/Add';
import Typography from '@material-ui/core/Typography';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';

import { api } from './Api'

const useStyles = makeStyles({
  table: {
    minWidth: 650,
  },
});

export default function ProtocolDetail({project, protocol}) {
  const classes = useStyles();
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
  }, [protocol]);

  const onSubmit = (values) => {
    console.log('submitting ', values, values.doses);
    Promise.all(values.doses.map(dose => {
      const data = {
        protocol: protocol.id,
        ...dose,
      };
      if (dose.id) {
        return api.put(`api/dose/${dose.id}/`, data)
      } else {
        return api.post(`api/dose/`, data)
      }
    })).then(doses => {
      const data = {
        ...doses,
      }
      console.log('submitting protocol', data);
      api.put(`api/protocol/${protocol.id}/`, data)
        .then(project.refresh(project.id));

    });
    
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
      <Table size="small" aria-label="a dense table">
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
            <TableRow key={dose.keyName}>
              <TableCell>
              {index > 0 &&
              <IconButton 
                onClick={() => swap(index, index-1)}
              >
                <ArrowUpwardIcon/>
              </IconButton>
              }
              {index < protocol.doses.length-1 &&
              <IconButton 
                onClick={() => swap(index, index+1)}
              >
                <ArrowDownwardIcon/>
              </IconButton>
              }
              <IconButton 
                onClick={() => remove(index)}
              >
                <DeleteIcon />
              </IconButton>
              </TableCell>
              {dose_columns.map(col => (
              <TableCell>
                <FormTextField 
                  control={control} 
                  defaultValue={dose[col.field]}
                  name={`dose[${index}].${col.field}`}
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
      <Button type="submit" color="primary">
        Save
      </Button>
    </form>
  )
}
