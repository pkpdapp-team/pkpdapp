import React, { useEffect } from "react";
import { useSelector, useDispatch } from 'react-redux'
import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import { useForm, useFieldArray } from "react-hook-form";
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

import { selectUnitById } from '../projects/unitsSlice'
import {FormTextField, FormSelectField} from '../forms/FormComponents';

import {userHasReadOnlyAccess} from '../projects/projectsSlice';

import {
  updateProtocol, deleteProtocol
} from '../protocols/protocolsSlice.js'

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
    '& > *': {
      margin: theme.spacing(1),
    },
  },
}));

export default function ProtocolDetail({project, protocol}) {
  const classes = useStyles();
  const dispatch = useDispatch();
  console.log('protocol', protocol);
  const { control, handleSubmit, reset } = useForm(protocol);
  const { fields, append, remove } = useFieldArray(
    {
      control,
      name: "doses",
      keyName: "keyId",
    }
  );

  useEffect(() => {
    reset(protocol);
  }, [reset, protocol]);

  const handleProtocolDelete = () => {
    dispatch(deleteProtocol(protocol.id))
  }

  const onSubmit = (values) => {
    dispatch(updateProtocol(values));
  };

  const amount_unit_id = protocol.amount_unit
  let amount_unit = useSelector(state => selectUnitById(state, amount_unit_id));
  if (!amount_unit) {
    amount_unit = {
      symbol: 'X'
    }
  }
  const amount_unit_options = amount_unit.compatible_units.map(
    u => { return {key: u.symbol, value: u.id}}
  )

  const time_unit_id = protocol.time_unit
  let time_unit = useSelector(state => selectUnitById(state, time_unit_id));
  if (!time_unit) {
    time_unit = {
      symbol: 'X'
    }
  }
  const time_unit_options = time_unit.compatible_units.map(
    u => { return {key: u.symbol, value: u.id}}
  )


  const dose_type_options = [
    {key: 'IV', value: 'D'},
    {key: 'Extravascular', value: 'I'}, 
  ]

  const dose_columns = [
    { title: "Start Time", field: "start_time" },
    { title: "Amount", field: "amount" },
    { title: "Duration", field: "duration" },
  ];

  const disableSave = userHasReadOnlyAccess(project)

  return (
    <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
      <Typography>Protocol</Typography>
      <FormTextField 
        control={control} 
        defaultValue={protocol.name}
        name="name" label="Name"
      />
      <FormSelectField 
        control={control} 
        options={dose_type_options}
        defaultValue={protocol.dose_type}
        name="dose_type" label="Dosing Type"
      />
      <FormSelectField 
        control={control} 
        options={amount_unit_options}
        defaultValue={protocol.amount_unit}
        name="amount_unit" label="Amount Unit"
      />
      <FormSelectField 
        control={control} 
        options={time_unit_options}
        defaultValue={protocol.time_unit}
        name="time_unit" label="Time Unit"
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
          { id: null, start_time: 0, amount: 0, duration: 1.0 }
        )}>
        <AddIcon />
      </IconButton>
    </TableContainer>
    <div className={classes.controls}>
      <Button 
        variant="contained"
        disabled={disableSave}
        type="submit" >
        Save
      </Button>
      <Button 
        variant="contained"
        disabled={disableSave}
        onClick={handleProtocolDelete}
      >
        Delete 
      </Button>
      </div>
    </form>
  )
}
