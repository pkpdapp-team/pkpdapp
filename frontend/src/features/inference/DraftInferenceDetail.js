import React, { useEffect, useState } from "react";
import { useSelector } from 'react-redux'
import { useDispatch } from 'react-redux'
import Button from '@material-ui/core/Button';

import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import Alert from '@material-ui/lab/Alert';
import { useForm, useFieldArray } from "react-hook-form";
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
import DeleteIcon from '@material-ui/icons/Delete';



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
  selectBiomarkerTypesByDatasetId
} from '../datasets/biomarkerTypesSlice'


import {
  selectPriorsByInference
} from './priorsSlice'

import {
  selectObjectiveFunctionsByInference
} from './objectiveFunctionsSlice'

import {
  selectVariablesByPdModel, selectVariablesByDosedPkModel
} from '../variables/variablesSlice'


import {
  selectAllDatasets
} from '../datasets/datasetsSlice'


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


function PriorSubform({control, objects, variables, append, remove}) {
  
  const variable_options = variables.filter(
    variable => variable.constant
  ).map(variable => 
    ({ key: variable.name, value:variable.id })
  );
  if (variable_options.length === 0) {
    return (null)
  }
  const type_options = [
    { key: 'Normal', value: 'PriorNormal'},
    { key: 'Uniform', value: 'PriorUniform'},
    { key: 'Boundary', value: 'Boundary'},
  ]
  const handleNewPrior = () => 
    append({ 
      type: 'PriorNormal',
      mean: 1.0,
      sd: 1.0,
      variable: variable_options[0].value,
    })
  
  return (
    <React.Fragment>
    <Typography>Parameter Priors</Typography>
    <List>
      {objects.map((prior, index) => {
        const baseName = `priors.${index}`
        return (
          <ListItem key={index} role={undefined} dense >
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
            <Tooltip title={`delete prior`} placement="right">
              <IconButton
                variant='rounded' 
                onClick={ remove(index) }
              >
                <DeleteIcon/>
              </IconButton>
            </Tooltip>
          </ListItem>
        );
      })}
        <ListItem key={-1} role={undefined} dense >
          <Tooltip title={`create new prior`} placement="right">
          <IconButton
            variant='rounded' 
            onClick={handleNewPrior}
          >
            <AddIcon/>
          </IconButton>
        </Tooltip>
        </ListItem>
      </List>
    </React.Fragment>
  )
}

function ObjectiveFunctionSubform({control, objects, variables, biomarker_types, append, remove }) {
  if (! biomarker_types || biomarker_types.length == 0) {
    return (null)
  }
  const variable_options = variables.filter(
    variable => variable.state
  ).map(variable => 
    ({ key: variable.name, value:variable.id })
  );
  if (variable_options.length == 0) {
    return (null)
  }
  const biomarker_type_options = biomarker_types.map(biomarker_type => 
    ({ key: biomarker_type.name, value: biomarker_type.id })
  );
  const type_options = [
    { key: 'LogLikelihoodNormal', value: 'LogLikelihoodNormal'},
    { key: 'LogLikelihoodLogNormal', value: 'LogLikelihoodLogNormal'},
    { key: 'SumOfSquaredErrorsScoreFunction', value: 'SumOfSquaredErrorsScoreFunction'},
  ]
  const handleNewObjectiveFunction = () => 
    append({ 
      type: 'LogLikelihoodNormal',
      sd: 1.0,
      variable: variable_options[0].value,
      biomarker_type: biomarker_type_options[0].value,
    })
  
  return (
    <React.Fragment>
    <Typography>Objective Functions</Typography>
    <List>
    {objects.map((objectiveFunction, index) => {
      const baseName = `objective_functions.${index}`
      return (
        <ListItem key={index} role={undefined} dense >
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
          <Tooltip title={`delete objective function`} placement="right">
            <IconButton
              variant='rounded' 
              onClick={ remove(index) }
            >
              <DeleteIcon/>
            </IconButton>
          </Tooltip>
        </ListItem>
      );
    })}
      <ListItem key={-1} role={undefined} dense >
        <Tooltip title={`create new objective function`} placement="right">
        <IconButton
          variant='rounded' 
          onClick={handleNewObjectiveFunction}
        >
          <AddIcon/>
        </IconButton>
      </Tooltip>
      </ListItem>
    </List>
    </React.Fragment>
  )
}



export default function DraftInferenceDetail({project, inference}) {
  
  const datasets = useSelector(selectAllDatasets)
  const datasets_options = datasets.map(dataset => (
    { key: dataset.name, value: dataset.id }
  ))
  const [dataset, setDataset] = useState();
  const handleDatasetChange = (event) => {
    const value = event.target.value
    setDataset(value)
  }
  console.log('dataset', dataset)
  const biomarker_types = useSelector((state) =>
    dataset ? selectBiomarkerTypesByDatasetId(state, dataset) : []
  )
  const classes = useStyles();
  const { control, handleSubmit, reset, watch } = useForm({defaultValues: inference});

  const { 
    fields: priors, append: priorsAppend, 
    remove: priorsRemove 
  } = useFieldArray({
    control,
    name: "priors"
  });
  const { 
    fields: objectiveFunctions, 
    append: objectiveFunctionsAppend, 
    remove: objectiveFunctionsRemove 
  } = useFieldArray({
    control,
    name: "objective_functions"
  });
  const dispatch = useDispatch();

  const [modelType, setModelType] = useState('PD');
  const handleModelTypeChange = (event) => {
    const value = event.target.value
    setModelType(value)
  }
  const watchPdModel = watch("pd_model");
  const watchPkModel = watch("dosed_pk_model");

  const variables = useSelector((state) => {
    if (modelType === 'PD') {
      return selectVariablesByPdModel(state, watchPdModel)
    } else if (modelType === 'PK') {
      return selectVariablesByDosedPkModel(state, watchPkModel)
    }
  })
  console.log('variables', variables)
  console.log('biomarker_types', biomarker_types)

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

      <FormControl className={classes.formInput}>
      <InputLabel id="dataset-label">Dataset</InputLabel>
      <Select
        labelId="model-type-label"
        onChange={handleDatasetChange}
        value={dataset}

        >
        {datasets_options.map((option, i) => {
          return (
            <MenuItem key={i} value={option.value}>{option.key}</MenuItem>
          )
        })}
      </Select>
      </FormControl>
      
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

      <PriorSubform
        control={control}
        objects={priors}
        variables={variables}
        append={priorsAppend} 
        remove={priorsRemove} 
      />
      
      <ObjectiveFunctionSubform
        control={control}
        objects={objectiveFunctions}
        variables={variables}
        append={objectiveFunctionsAppend} 
        remove={objectiveFunctionsRemove} 
        biomarker_types={biomarker_types}
      />
      
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
