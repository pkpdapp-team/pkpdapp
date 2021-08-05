import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from 'react-redux'
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import Alert from '@material-ui/lab/Alert';
import DialogTitle from '@material-ui/core/DialogTitle';
import { useForm, Controller  } from "react-hook-form";
import { makeStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import ExpansionPanel from '@material-ui/core/ExpansionPanel';
import ExpansionPanelSummary from '@material-ui/core/ExpansionPanelSummary';
import ExpansionPanelDetails from '@material-ui/core/ExpansionPanelDetails';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';



import ComponentForm from '../forms/ComponentForm'
import {updatePdModel, uploadPdSbml} from '../pdModels/pdModelsSlice'
import {FormCheckboxField, FormTextField, FormSelectField, FormSliderField, FormFileField} from '../forms/FormComponents';

const useStyles = makeStyles((theme) => ({
  controlsRoot: {
    display: 'flex',
    alignItems: 'center',
  },
  controls: {
    margin: theme.spacing(1),
  },
  components: {
    width: '100%',
  }
}));



export default function PdDetail({project, pd_model}) {
  const classes = useStyles();
  const { control, clearErrors, handleSubmit, reset } = useForm();
  const dispatch = useDispatch();

  console.log('pddetail', pd_model);

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const [file] = files;
    let reader = new FileReader();

    reader.onload = function() {
      dispatch(uploadPdSbml({id: pd_model.id, sbml: reader.result}))
    };

    reader.onerror = function() {
      console.log(reader.error);
    };

    reader.readAsText(file);
  };

  useEffect(() => {
    reset(pd_model);
  }, [reset, pd_model]);

  const onSubmit = (values) => {
    dispatch(updatePdModel(values))
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
      <Typography>PD Model</Typography>

      <FormTextField 
        control={control} 
        defaultValue={pd_model.name}
        name="name" label="Name"
      />

      <Typography>Components</Typography>
      <List>
      {pd_model.components.map((component, index) => {
        return (
          <ListItem key={index} role={undefined} dense >
            <div className={classes.components}>
            <ExpansionPanel >
              <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                <Typography className={classes.heading}>{component.name}</Typography>
              </ExpansionPanelSummary>
              <ExpansionPanelDetails>
                <ComponentForm control={control} component={component}/>
              </ExpansionPanelDetails>
            </ExpansionPanel>
            </div>
          </ListItem>
        );
      })}
      </List>

      <FormTextField 
        control={control} 
        defaultValue={pd_model.time_max}
        name="time_max" label="Maximum Time"
        type="number"
      />


      <div  className={classes.controlsRoot}>
      <Button 
        className={classes.controls}
        type="submit" 
        variant="contained"
      >
        Save
      </Button>

      <Button
          className={classes.controls}
          component="label"
          variant="contained"
        >
          Upload SBML file
          <input
            type="file"
            hidden
            onChange={handleFileUpload}
          />
     </Button>

    </div>

    {pd_model.errors && pd_model.errors.map((error, index) => (
      <Alert key={index} severity="error">
        {error}
      </Alert>
    ))}

    </form>
  )
}
