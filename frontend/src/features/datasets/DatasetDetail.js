import React, { useEffect } from "react";
import { useDispatch } from 'react-redux'
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import Alert from '@material-ui/lab/Alert';
import { useForm } from "react-hook-form";
import { makeStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import Checkbox from '@material-ui/core/Checkbox';

import {updateDataset, uploadDatasetCsv} from '../datasets/datasetsSlice'
import {FormTextField, FormDateTimeField} from '../forms/FormComponents';

const useStyles = makeStyles((theme) => ({
  controlsRoot: {
    display: 'flex',
    alignItems: 'center',
  },
  controls: {
    margin: theme.spacing(1),
  },
}));

export default function DatasetDetail({project, dataset}) {
  const classes = useStyles();
  const { control, handleSubmit, reset } = useForm();
  const dispatch = useDispatch();


  useEffect(() => {
    reset(dataset);
  }, [reset, dataset]);

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const [file] = files;
    dispatch(uploadDatasetCsv({id: dataset.id, csv: file}))
  };

  const onSubmit = (values) => {
    dispatch(updateDataset(values))
  };

  const subject_groups = [
    ...new Set(dataset.subjects.map(s => s.group || 'None'))
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
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
        type="submit" 
        variant="contained"
        className={classes.button}
      >
        Save
      </Button>
      <Button
          className={classes.controls}
          component="label"
          variant="contained"
        >
          Upload CSV file
          <input
            type="file"
            hidden
            accept=".csv"
            onChange={handleFileUpload}
          />
     </Button>
    {dataset.errors && dataset.errors.map((error, index) => (
      <Alert key={index} severity="error">
        {error}
      </Alert>
    ))}
    </form>
  )
}
