import React, { useEffect } from "react";
import { useDispatch } from 'react-redux'
import Button from '@material-ui/core/Button';
import Alert from '@material-ui/lab/Alert';
import { useForm } from "react-hook-form";
import { makeStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import Accordion from '@material-ui/core/Accordion';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';



import ComponentForm from '../forms/ComponentForm'
import {updatePdModel, uploadPdSbml, deletePdModel} from '../pdModels/pdModelsSlice'
import {FormTextField} from '../forms/FormComponents';

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
  const { control, handleSubmit, reset } = useForm();
  const dispatch = useDispatch();


  const handlePdDelete= () => {
    dispatch(deletePdModel(pd_model.id))
  }

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
            <Accordion >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography className={classes.heading}>{component.name}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <ComponentForm control={control} component={component}/>
              </AccordionDetails>
            </Accordion>
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
        variant="contained"
        onClick={handlePdDelete}
      >
        Delete 
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
