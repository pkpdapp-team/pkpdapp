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
import Tooltip from '@material-ui/core/Tooltip';
import Select from '@material-ui/core/Select';
import Accordion from '@material-ui/core/Accordion';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import IconButton from '@material-ui/core/IconButton';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import MenuItem from '@material-ui/core/MenuItem';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import AddIcon from '@material-ui/icons/Add';



import ComponentForm from '../forms/ComponentForm'
import {
  selectAllPkModels
} from '../pkModels/pkModelsSlice'
import {
  selectAllPdModels
} from '../pdModels/pdModelsSlice'
import {
  selectAllAlgorithms
} from '../inference/algorithmsSlice'


import {
  selectPriorsByInference
} from './priorsSlice'

import {
  selectObjectiveFunctionsByInference
} from './objectiveFunctionsSlice'

import {
  selectVariablesByInference
} from '../variables/variablesSlice'



import {
  updateInference, deleteInference
} from '../inference/inferenceSlice'
import { runInference } from './inferenceSlice'
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


function PriorSubform({control, prior, variables}) {
  const baseName = `priors. ${prior.id}`
  const variable_options = variables.filter(
    variable => variable.is_constant
  ).map(variable => 
    ({ key: variable.name, value:variable.id })
  );
  const type_options = [
    { key: 'Normal', value: 'PriorNormal'},
    { key: 'Uniform', value: 'PriorUniform'},
    { key: 'Boundary', value: 'Boundary'},
  ]
  return (
    <React.Fragment>
    <FormSelectField 
      control={control} 
      defaultValue={prior.variable || ''}
      options={variable_options}
      name={`${baseName}.variable`}
      label="Variable"
    />
    <FormSelectField 
      control={control} 
      defaultValue={prior.type || ''}
      options={type_options}
      name={`${baseName}.type`}
      label="Type"
    />
    <Typography>{prior.type}</Typography>
    </React.Fragment>
  )
}

function ObjectiveFunctionSubform({control, objectiveFunction, variables}) {
  const baseName = `objective_functions. ${objectiveFunction.id}`
  const variable_options = variables.filter(
    variable => variable.is_state
  ).map(variable => 
    ({ key: variable.name, value:variable.id })
  );
  const type_options = [
    { key: 'LogLikelihoodNormal', value: 'LogLikelihoodNormal'},
    { key: 'LogLikelihoodLogNormal', value: 'LogLikelihoodLogNormal'},
    { key: 'SumOfSquaredErrorsScoreFunction', value: 'SumOfSquaredErrorsScoreFunction'},
  ]
  return (
    <React.Fragment>
    <FormSelectField 
      control={control} 
      defaultValue={objectiveFunction.variable || ''}
      options={variable_options}
      name={`${baseName}.variable`}
      label="Variable"
    />
    <FormSelectField 
      control={control} 
      defaultValue={objectiveFunction.type || ''}
      options={type_options}
      name={`${baseName}.type`}
      label="Type"
    />
    <Typography>{objectiveFunction.type}</Typography>
    </React.Fragment>
  )
}



export default function DraftInferenceDetail({project, inference}) {
  const priors = useSelector((state) =>
    selectPriorsByInference(state, inference)
  );
  const objectiveFunctions = useSelector((state) =>
    selectObjectiveFunctionsByInference(state, inference)
  );
  const variables = useSelector((state) =>
    selectVariablesByInference(state, inference)
  )
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

  const handleRun = () => {
    dispatch(runInference(inference.id))
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

  const handleNewPrior = () => {
    const values = {
      ...inference,
      priors: [
        ...inference.priors,
        { 
          inference: inference.id, 
          type: 'PriorUniform',
          lower: 0,
          upper: 1,
        }
      ],
    }
    console.log('new prior', values)
    dispatch(updateInference(values))
  }

  const disableSave = userHasReadOnlyAccess(project)

  const algorithms = useSelector(selectAllAlgorithms)
  const algorithm_options = algorithms ? 
    algorithms.map(algorithm => (
      {
        key: algorithm.name, 
        value: algorithm.id, 
        group: algorithm.category == 'SA' ?
        'Sampling': 'Optimisation'
      }
    ))  
    : [{key: 'Loading...', value: null, group: null}]


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

      <Typography>Parameter Priors</Typography>
      <List>
      {priors.map((prior, index) => {
        return (
          <ListItem key={index} role={undefined} dense >
          <PriorSubform
            control={control}
            prior={prior}
            variables={variables}
          />
          </ListItem>
        );
      })}
        <ListItem key={-1} role={undefined} dense >
          <Tooltip title={`create new prior`} placement="right">
          <IconButton
            variant='rounded' 
            className={classes.controls}
            onClick={handleNewPrior}
          >
            <AddIcon/>
          </IconButton>
        </Tooltip>
        </ListItem>
      </List>
      <Typography>Objective Functions</Typography>
      <List>
      {objectiveFunctions.map((objectiveFunction, index) => {
        return (
          <ListItem key={index} role={undefined} dense >
            <ObjectiveFunctionSubform
              control={control}
              prior={objectiveFunction}
              variables={variables}
            />
          </ListItem>
        );
      })}
      </List>

      <FormSelectField 
        control={control} 
        defaultValue={inference.algorithm}
        useGroups
        options={algorithm_options}
        name="algorithm" label="Algorithm"
      />

      <FormTextField 
        control={control} 
        name="max_number_of_iterations" label="Maximum iterations"
        type="number"
      />

      <FormTextField 
        control={control} 
        name="number_of_chains" label="Number of chains"
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
        disabled={disableSave}
        onClick={handleRun}
        variant="contained"
      >
        Run
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
