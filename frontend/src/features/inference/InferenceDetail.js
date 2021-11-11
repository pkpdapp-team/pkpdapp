import React, { useEffect, useState } from "react";
import { useSelector } from 'react-redux'
import { useDispatch } from 'react-redux'
import Button from '@material-ui/core/Button';

import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import Alert from '@material-ui/lab/Alert';
import { useForm } from "react-hook-form";
import { makeStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import Select from '@material-ui/core/Select';
import Accordion from '@material-ui/core/Accordion';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import MenuItem from '@material-ui/core/MenuItem';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';



import ComponentForm from '../forms/ComponentForm'
import {
  selectAllPkModels
} from '../pkModels/pkModelsSlice'
import {
  selectAllPdModels
} from '../pdModels/pdModelsSlice'



import {
  updateInference, deleteInference, selectAllInferences
} from '../inference/inferenceSlice'
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
  modelSelect: {
    display: 'flex',
  },
  components: {
    width: '100%',
  },
  formInput: {
    margin: theme.spacing(1),
  },
}));



export default function InferenceDetail({project, inference}) {
  const classes = useStyles();
  const { control, handleSubmit, reset } = useForm();
  const dispatch = useDispatch();

  const [modelType, setModelType] = useState('PD');
  const handleModelTypeChange = (event) => {
    const value = event.target.value
    setModelType(value)
  }
  


  const handleDelete= () => {
    dispatch(deleteInference(inference.id))
  }

  useEffect(() => {
    if (inference.pd_model) {
      setModelType('PD')
    } else if (inference.dosed_pk_model) {
      setModelType('PK')
    }
  }, [inference.pd_model, inference.dosed_pk_model]);


  useEffect(() => {
    console.log('reseting form', inference)
    reset({
      ...inference,
      pd_model: inference.pd_model || '',
      dosed_pk_model: inference.dosed_pk_model || '',
    });
  }, [reset, inference]);

  const onSubmit = (values) => {
    console.log('submit with values', values)
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


  const pdModels = useSelector(selectAllPdModels)
  const pd_model_options = pdModels ? 
    pdModels.map(pd => (
      {key: pd.name, value: pd.id}
    )).concat([{key: 'None', value: ''}])  
    : [{key: 'Loading...', value: null}]

  const pkModels = useSelector(selectAllPkModels)
  const dosed_pk_model_options= pkModels ? 
    pkModels.map(pk => (
      {key: pk.name, value: pk.id}
    )).concat([{key: 'None', value: ''}]) 
    : [{key: 'Loading...', value: null}]

  console.log('inference detail', inference, pdModels, pkModels)

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
      <div
        className={classes.modelSelect}
      >
      <FormControl className={classes.formInput}>
      <InputLabel id="model-type-label">Model Type</InputLabel>
      <Select
        labelId="model-type-label"
        onChange={handleModelTypeChange}
        value={modelType}

        >
        {model_type_options.map((option, i) => {
          return (
            <MenuItem key={i} value={option.value}>{option.key}</MenuItem>
          )
        })}
      </Select>
      </FormControl>

      {modelType === 'PK' &&
      
      <FormSelectField 
        control={control} 
        defaultValue={inference.dosed_pk_model || ''}
        options={dosed_pk_model_options}
        name="dosed_pk_model" label="Dosed Pharmacokinetic Model"
      />
      }

      {modelType === 'PD' &&
      <FormSelectField 
        control={control} 
        defaultValue={inference.pd_model || ''}
        options={pd_model_options}
        name="pd_model" label="Pharmacodynamic Model"
      />
      }
      </div>

      <FormSelectField 
        control={control} 
        defaultValue={inference.inference_type}
        options={inference_type_options}
        name="inference_type" label="Inference Type"
      />

      <FormSelectField 
        control={control} 
        defaultValue={inference.sampling_algorithm}
        options={sampling_algorithm_options}
        name="sampling_algorithm" label="Sampling Algorithm"
      />

      <FormSelectField 
        control={control} 
        defaultValue={inference.optimisation_algorithm}
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
        name="number_of_chains" label="Number of chains"
        type="number"
      />

      <FormTextField 
        control={control} 
        name="time_elapsed" label="Elapsed computational run time (sec)"
        disabled
        type="number"
      />

      <FormDateTimeField 
        control={control} 
        disabled
        name="datetime" label="DateTime"
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
