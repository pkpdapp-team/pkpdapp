import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from 'react-redux'
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import Grid from '@material-ui/core/Grid';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import { useForm, Controller  } from "react-hook-form";
import { makeStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import Checkbox from '@material-ui/core/Checkbox';

import {updateDataset} from '../datasets/datasetsSlice'
import {FormTextField, FormDateTimeField, FormSelectField} from '../forms/FormComponents';

const useStyles = makeStyles((theme) => ({
  button: {
    margin: theme.spacing(1),
  },
}));

export default function DatasetDetail({project, dataset}) {
  const classes = useStyles();
  const { control, handleSubmit, reset } = useForm();
  const dispatch = useDispatch();

  console.log('dataset', dataset);

  useEffect(() => {
    console.log('reset', dataset);
    reset(dataset);
  }, [reset, dataset]);

  const onSubmit = (values) => {
    dispatch(updateDataset(values))
  };

  const subject_groups = [
    ...new Set(dataset.subjects.map(s => s.group || 'None'))
  ];

  const handleFileUpload = (file) => {
    alert('file upload not yet implemented');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
      <Typography>Dataset</Typography>
      <FormTextField 
        control={control} 
        defaultValue={dataset.name}
        name="name" label="Name"
      />
      <FormDateTimeField 
        control={control} 
        defaultValue={dataset.datetime}
        name="datetime" label="DateTime"
      />

      <Grid container item xs={12} spacing={3}>
      <Grid item xs={6}>
      <Typography>Variables</Typography>
      <List>
      {dataset.biomarker_types.map((biomarker) => {
        return (
          <ListItem key={biomarker.id} role={undefined} dense button >
            <ListItemIcon>
              <Checkbox
                edge="start"
                checked={false}
                tabIndex={-1}
                disableRipple
              />
            </ListItemIcon>
            <ListItemText primary={biomarker.name} />
          </ListItem>
        );
      })}
      </List>
      </Grid>
      <Grid item xs={6}>
      <Typography>Subject Groups</Typography>
      <List>
      {subject_groups.map((group, index) => {
        return (
          <ListItem key={index} role={undefined} dense button >
            <ListItemIcon>
              <Checkbox
                edge="start"
                checked={false}
                tabIndex={-1}
                disableRipple
              />
            </ListItemIcon>
            <ListItemText primary={group} />
          </ListItem>
        );
      })}
      </List>

      </Grid>
      </Grid>
      <Button
        variant="contained"
        component="label"
        className={classes.button}
      >
        Upload CSV File
        <input
          type="file"
          onChange={
            (evnt) => handleFileUpload(evnt.target.files[0])
          }
          hidden
        />
      </Button>
      <Button 
        type="submit" 
        variant="contained"
        className={classes.button}
      >
        Save
      </Button>
    </form>
  )
}
