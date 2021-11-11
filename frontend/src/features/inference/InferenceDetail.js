import React, { useEffect } from "react";
import { useSelector } from 'react-redux'
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
import {updateInference, deleteInference} from '../inference/inferenceSlice'
import {
  FormTextField, FormDateTimeField, FormSelectField
} from '../forms/FormComponents';
import {userHasReadOnlyAccess} from '../projects/projectsSlice';

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



export default function InferenceDetail({project, inference}) {
  const classes = useStyles();
  let model_type = null;
  if (inference.pd_model) {
    model_type = 'PD'
  }
  if (inference.dosed_pk_model) {
    model_type = 'PK'
  }
  const { control, handleSubmit, reset } = useForm({
    defaultValues: {
      ...inference,
      model_type: model_type,
    }
  });
  const dispatch = useDispatch();


  const handleDelete= () => {
    dispatch(deleteInference(inference.id))
  }

  useEffect(() => {
    reset(inference);
  }, [reset, inference]);

  const onSubmit = (values) => {
    dispatch(updateInference(values))
  };

  const disableSave = userHasReadOnlyAccess(project)

  const inference_type_options = [
    {key: 'Sampling', value: 'SA'},
    {key: 'Optimisation', value: 'OP'}, 
  ]

  const sampling_algorithm_options = [
    {key: 'Haario-Bardenet', value: 'HB'},
    {key: 'Differential evolution', value: 'DE'},
    {key: 'DREAM', value: 'DR'}, 
    {key: 'Population MCMC', value: 'PO'}, 
  ]

  const optimisation_algorithm_options = [
    {key: 'CMAES', value: 'CMAES'},
    {key: 'XNES', value: 'XNES'},
    {key: 'SNES', value: 'SNES'}, 
    {key: 'Nelder-Mead', value: 'NM'}, 
  ]


  const model_type_options = [
    {key: 'Pharmacodynamic', value: 'PD'},
    {key: 'Pharmacokinetic', value: 'PK'},
  ]


  const pdModels = useSelector((state) => state.variables.pdModels)
  const pd_model_options = pdModels.map(pd => (
    {key: pd.name, value: pd.id}
  ))

  const pkModels = useSelector((state) => state.variables.pkModels)
  const dosed_pk_model_options = pkModels.map(pd => (
    {key: pd.name, value: pd.id}
  ))

  return (
    <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
      <FormTextField 
        control={control} 
        name="name" label="Name"
      />

      <FormTextField 
        control={control} 
        fullWidth
        multiline
        name="description" label="Description"
      />

      <FormSelectField 
        control={control} 
        options={model_type_options}
        defaultValue={model_type}
        name="model_type" label="Model Type"
      />

      {model_type === 'PK' &&
      <FormSelectField 
        control={control} 
        options={dosed_pk_model_options}
        name="dosed_pk_model" label="Dosed Pharmacokinetic Model"
      />
      }

      {model_type === 'PD' &&
      <FormSelectField 
        control={control} 
        options={pd_model_options}
        name="pd_model" label="Pharmacodynamic Model"
      />
      }

      <FormDateTimeField 
        control={control} 
        disabled
        name="datetime" label="DateTime"
      />

      <FormSelectField 
        control={control} 
        options={inference_type_options}
        name="inference_type" label="Inference Type"
      />

      <FormSelectField 
        control={control} 
        options={sampling_algorithm_options}
        name="sampling_algorithm" label="Sampling Algorithm"
      />

      <FormSelectField 
        control={control} 
        options={optimisation_algorithm_options}
        name="optimisation_algorithm" label="Optimisation Algorithm"
      />

      <FormTextField 
        control={control} 
        name="number_of_iterations" label="Maximum iterations"
        type="number"
      />

      <FormTextField 
        control={control} 
        name="time_elapsed" label="Elapsed computational run time (sec)"
        disabled
        type="number"
      />

      <FormTextField 
        control={control} 
        name="number_of_chains" label="Number of chains"
        type="number"
      />

      <FormTextField 
        control={control} 
        name="number_of_function_evals" label="Number of function evaluations"
        disabled
        type="number"
      />

      


      <div  className={classes.controlsRoot}>
      <Button 
        className={classes.controls}
        type="submit" 
        disabled={disableSave}
        variant="contained"
      >
        Save
      </Button>
      <Button 
        className={classes.controls}
        variant="contained"
        onClick={handleDelete}
        disabled={disableSave}
      >
        Delete 
      </Button>

    </div>

    {inference.errors && inference.errors.map((error, index) => (
      <Alert key={index} severity="error">
        {error}
      </Alert>
    ))}

    </form>
  )
}
