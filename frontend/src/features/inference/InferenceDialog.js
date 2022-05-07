import React, { useEffect, useState, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useForm, useFieldArray } from "react-hook-form";
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import { makeStyles } from "@material-ui/core/styles";
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core//DialogTitle';
import Button from '@material-ui/core/Button';
import List from "@material-ui/core/List";
import IconButton from "@material-ui/core/IconButton";
import AddIcon from "@material-ui/icons/Add";
import DeleteIcon from "@material-ui/icons/Delete";
import ListItem from "@material-ui/core/ListItem";
import Grid from "@material-ui/core/Grid";
import Stepper from '@material-ui/core/Stepper';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';
import Typography from '@material-ui/core/Typography';

import ModellingChart from '../modelling/Chart';
import { FormTextField, FormSelectField, FormSliderField } from "../forms/FormComponents";
import { selectAllAlgorithms } from "../inference/algorithmsSlice";
import { selectAllDatasets } from "../datasets/datasetsSlice";
import { runNaivePooledInference, selectAllInferences } from "../inference/inferenceSlice";
import { selectWritablePkModels, selectReadOnlyPkModels } from "../pkModels/pkModelsSlice";
import { selectWritablePdModels, selectReadOnlyPdModels } from "../pdModels/pdModelsSlice";
import {
  selectBiomarkerTypesByDatasetId,
  selectBiomarkerTypeById,
} from "../datasets/biomarkerTypesSlice";
import {
  selectVariablesByPdModel,
  selectVariablesByDosedPkModel,
  selectVariableById,
} from "../variables/variablesSlice";


function variableGetDefaultValue(variable) {
  if (variable.is_log) {
    return Math.exp(variable.default_value)
  } else {
    return variable.default_value
  }
}

const useStyles = makeStyles(() => ({
  dialogPaper: {
    minHeight: '500px',
    maxHeight: '80vh',
  },
  chart: {
    height: "50vh",
    width: "100%",
  },
}));

export default function InferenceDialog({ project, open, handleCloseDialog, defaultValues }) {
  const dispatch = useDispatch();

  const classes = useStyles();

  const [activeStep, setActiveStep] = React.useState(0);

  const steps = [
    'Model and dataset', 
    'Observables',
    'Parameters',
    'Inference options', 
  ];

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const algorithms = useSelector(selectAllAlgorithms);
  const algorithm_options = algorithms
    ? algorithms.map((algorithm) => ({
        key: algorithm.name,
        value: algorithm.id,
        group: algorithm.category === "SA" ? "Sampling" : "Optimisation",
      }))
    : [{ key: "Loading...", value: null, group: null }];


  const initialization_options = [
    { key: "NA", value: "" },
    { key: "Random from prior", value: "R" },
    { key: "Default values of model", value: "D" },
    { key: "From another inference", value: "F" },
  ]

  const pd_models = useSelector(state => selectWritablePdModels(state));
  const dosed_pk_models = useSelector(state => selectWritablePkModels(state));
  const model_options = pd_models.map((model) => ({
    key: model.name,
    value: JSON.stringify({id: model.id, form: 'PD'}),
    group: 'Pharmacodynamic',
  })).concat(dosed_pk_models.map((model) => ({
    key: model.name,
    value: JSON.stringify({id: model.id, form: 'PK'}),
    group: 'Pharmacokinetic',
  })));

  if (defaultValues) {
    defaultValues = {
      ...defaultValues,
      model: JSON.stringify(defaultValues.model),
    }
  } else if (!defaultValues) {
    defaultValues = {
      name: '',
      description: '',
      project: project.id, 
      algorithm: 1, 
      initialization_strategy: 'R',
      initialization_inference: '',
      number_of_chains: 4,
      max_number_of_iterations: 1000,
      burn_in: 0,
      model: '',
      dataset: '',
    }
  }
  console.log('defaultValues', defaultValues)

  const { control, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues
  });

  const handleClose= () => {
    handleCloseDialog();
    setActiveStep(0);
    reset();
  };

  const {
    fields: observations,
    append: observationsAppend,
    remove: observationsRemove,
    replace: observationsReplace,
  } = useFieldArray({
    control,
    name: "observations",
  });

  const {
    fields: parameters,
    replace: parametersReplace,
  } = useFieldArray({
    control,
    name: "parameters",
  });

  const modelId = watch("model")
  const modelIdParse = modelId ? JSON.parse(modelId) : {id: null, form: null}
  const datasetId = watch("dataset")

  const chosenPkModel = dosed_pk_models.find(m => m.id === modelIdParse.id && modelIdParse.form === 'PK')
  const chosenPdModel = pd_models.find(m => m.id === modelIdParse.id && modelIdParse.form === 'PD')

  const variablesAll = useSelector((state) => {
    if (modelId) {
      if (modelIdParse.form === 'PD') {
        return selectVariablesByPdModel(state, modelIdParse.id);
      } else if (modelIdParse.form === 'PK') {
        return selectVariablesByDosedPkModel(state, modelIdParse.id);
      }
    } else {
      return [];
    }
  });
  const variables = useMemo(
    () => {
      return variablesAll.filter(variable => variable.name !== "time")
    },
    [JSON.stringify(variablesAll)]
  );

  const biomarker_types = useSelector((state) =>
    datasetId ? selectBiomarkerTypesByDatasetId(state, datasetId) : []
  );
  const biomarker_type_options = biomarker_types.map((biomarker_type) => ({
    key: biomarker_type.name,
    value: biomarker_type.name,
  })).concat([
    {key: "Simulated data", value: ""}
  ]);
  console.log('biomarker types', biomarker_types, biomarker_type_options)


  const observedVariables = observations.map(obs => obs.model)
  const variablesRemain = variables.filter(v => (
    !v.constant && !observedVariables.includes(v.qname)
  ))
  const handleNewObservation = () => {
    observationsAppend({
      model: variablesRemain[0].qname,
      biomarker: '',
      noise_form: 'N',
      noise_param_form: 'F',
      parameters: [variableGetDefaultValue(variablesRemain[0])],
    })
  };
  const handleDeleteObservation = (index) => () => {
    observationsRemove(index)
  };

  useEffect(() => {
    let model_observations = observations.filter(o => {
      const variable = variables.find(v => v.qname === o.model)
      if (variable) {
        return true
      }
      return false
    }).map( o => ({
      ...o,
      parameters: [...o.parameters]
    }))
    if (model_observations.length === 0 && variablesRemain.length > 0) {
      model_observations = [
        {
          model: variablesRemain[0].qname, 
          biomarker: '', 
          noise_form: 'N',
          noise_param_form: 'F',
          parameters: [variableGetDefaultValue(variablesRemain[0])],
        }
      ]
    }
    const model_params = variables.filter(variable => 
      variable.constant || variable.state
    ).map(variable => {
      const existing_param = parameters.find(p => p.name === variable.qname)
      if (existing_param) {
        return {
          name: existing_param.name,
          form: existing_param.form,
          parameters: [...existing_param.parameters],
        }
      }
      return {
        name: variable.qname, 
        form: 'F',
        parameters: [variableGetDefaultValue(variable)],
      }
    })
    parametersReplace(model_params)
    observationsReplace(model_observations)
    }
  , [JSON.stringify(variables)]);

  const datasets = useSelector(selectAllDatasets);
  const dataset_options = datasets.map((dataset) => ({
    key: dataset.name,
    value: dataset.id,
  })).concat([
    { key: 'Use simulated data', value: '' }
  ]);
  const chosenDataset = datasets.find(d => d.id === datasetId)

  const inferences = useSelector(selectAllInferences);
  const inference_options = inferences.map((inference) => ({
    key: inference.name,
    value: inference.id,
  })).concat([
    { key: "None", value: "" } 
  ]);

  const form_options = [
    { key: "Normal", value: "N" },
    { key: "LogNormal", value: "LN" },
    { key: "Uniform", value: "U" },
    { key: "Fixed", value: "F" },
  ];

  const obs_form_options = [
    { key: "Normal", value: "N" },
    { key: "LogNormal", value: "LN" },
  ];

  const handleFormChange = (baseName, variable, forObs) => (event) => {
    const newForm = event.target.value;
    if (variable) {
      if (newForm === "F") {
        const value = variableGetDefaultValue(variable)
        setValue(`${baseName}.parameters[0]`, value);
      } else if (newForm === "N" || newForm === 'LN') {
        const mean = forObs ? 0 : variableGetDefaultValue(variable)
        const standardDeviation = Math.sqrt(
          Math.pow(variable.upper_bound - variable.lower_bound, 2) / 12
        );
        setValue(`${baseName}.parameters[0]`, mean);
        setValue(`${baseName}.parameters[1]`, standardDeviation);
      } else if (newForm === "U") {
        const lower = variable.lower_bound
        const upper = variable.upper_bound
        setValue(`${baseName}.parameters[0]`, lower);
        setValue(`${baseName}.parameters[1]`, upper);
      }
    }
  };

  const onSubmit = (values) => {
    values = Object.keys(values).reduce((sum, key) => {
      let value = values[key]
      if (value === '') {
        value = null
      }
      if (key === 'model') {
        value = JSON.parse(value)
      }
      sum[key] = value
      return sum
    }, {})
    console.log('submit', values)
    dispatch(runNaivePooledInference(values));
    handleClose()
  };

  const max_number_of_iterations = watch(
    "max_number_of_iterations"
  )

  const prior_parameter_render = (baseName, watchForm) => {
    if (watchForm === 'F') {
      return (
        <FormTextField
          control={control}
          name={`${baseName}.parameters[0]`}
          label="Value"
          number
        />
      )
    } else if ((watchForm === 'N' || watchForm === 'LN')) {
      return (
        <React.Fragment>
        <FormTextField
          control={control}
          name={`${baseName}.parameters[0]`}
          label="Mean"
          number
        />
        <FormTextField
          control={control}
          name={`${baseName}.parameters[1]`}
          label="Sigma"
          number
        />
        </React.Fragment>
      )
    } else if (watchForm === 'U') {
      return (
        <React.Fragment>
        <FormTextField
          control={control}
          name={`${baseName}.parameters[0]`}
          label="Lower"
          number
        />
        <FormTextField
          control={control}
          name={`${baseName}.parameters[1]`}
          label="Upper"
          number
        />
        </React.Fragment>
      )
    }
  };

  const stepRenders = [
    (
      <React.Fragment>
      <FormSelectField
        control={control}
        useGroups
        options={model_options}
        defaultValue={defaultValues.model}
        displayEmpty
        name="model"
        label="Model"
      />
      <FormSelectField
        control={control}
        defaultValue={defaultValues.dataset}
        options={dataset_options}
        displayEmpty
        name="dataset"
        label="Dataset"
      />
      <ModellingChart 
        className={classes.chart}
        datasets={chosenDataset ? [chosenDataset] : []}
        pkModels={chosenPkModel ? [chosenPkModel] : []}
        pdModels={chosenPdModel ? [chosenPdModel] : []} 
      />
      </React.Fragment>
    ),
    (
      <List>
      {observations.map((obs, index) => {
        const baseName = `observations[${index}]`
        const watchForm = watch(`observations[${index}].noise_param_form`)
        const variable = variables.find(v => v.qname === obs.model)
        return (
        <ListItem key={index} role={undefined} dense>
          <Grid container spacing={1}>
          <Grid item xs={2}>
          <FormSelectField
            control={control}
            displayEmpty
            options={biomarker_type_options}
            name={`${baseName}.biomarker`}
            label={obs.model}
          />
          </Grid>
          <Grid item xs={8}>
          <FormSelectField
            control={control}
            options={obs_form_options}
            name={`${baseName}.noise_form`}
            label={'Noise form'}
          />
          <FormSelectField
            control={control}
            options={form_options}
            onChangeUser={handleFormChange(baseName, variable, false)}
            name={`${baseName}.noise_param_form`}
            label={'Noise param'}
          />
            {prior_parameter_render(baseName, watchForm)}
          </Grid>
          </Grid>
          <IconButton size="small" onClick={handleDeleteObservation(index)}>
            <DeleteIcon />
          </IconButton>
        </ListItem>
        )
      })}
       <IconButton
        disabled={variablesRemain.length === 0}
        onClick={handleNewObservation}
       >
          <AddIcon />
      </IconButton>
      <ModellingChart 
        className={classes.chart}
        datasets={chosenDataset ? [chosenDataset] : []}
        pkModels={chosenPkModel ? [chosenPkModel] : []}
        pdModels={chosenPdModel ? [chosenPdModel] : []} 
      />
      </List>
    ),
    (
      <List>
      {parameters.map((param, index) => {
        const baseName = `parameters[${index}]`
        const watchForm = watch(`parameters[${index}].form`)
        const variable = variables.find(v => v.qname === param.name)
        console.log('doing parameter', param, baseName, watchForm, variable)
        return (
        <ListItem key={index} role={undefined} dense>
          <Grid container spacing={1}>
          <Grid item xs={3}>
          <FormSelectField
            control={control}
            options={form_options}
            name={`parameters[${index}].form`}
            onChangeUser={handleFormChange(baseName, variable, false)}
            label={param.name}
          />
          </Grid>
          <Grid item xs={6}>
            {prior_parameter_render(baseName, watchForm)}
          </Grid>
          </Grid>
        </ListItem>
        )
      })}
      
      </List>

    ),
    (
      <React.Fragment>
      <FormTextField
        control={control}
        name="name"
        label="Name"
      />
      <FormTextField
        control={control}
        fullWidth
        multiline
        name="description"
        label="Description"
      />
      <FormSelectField
        control={control}
        useGroups
        options={algorithm_options}
        defaultValue={defaultValues.algorithm}
        name="algorithm"
        label="Algorithm"
      />
      <FormSelectField
        control={control}
        options={initialization_options}
        defaultValue={defaultValues.initialization_strategy}
        name="initialization_strategy"
        label="Initialization Strategy"
      />
      <FormSelectField
        control={control}
        defaultValue={defaultValues.initialization_inference}
        options={inference_options}
        displayEmpty
        name="initialization_inference"
        label="Initialize from"
      />
      <Grid container spacing={0}>
      <Grid item xs={6}>
      <FormSliderField
        control={control}
        name={"burn_in"}
        tooltip={"choose burn-in"}
        label={"Final burn-in iteration"}
        label_min={'0'}
        min={0}
        max={max_number_of_iterations}
      />
      </Grid>
      <Grid item xs={4}>
      <FormTextField
        control={control}
        name="max_number_of_iterations"
        defaultValue={defaultValues.max_number_of_iterations}
        label="Maximum iterations"
        type="number"
      />
      </Grid>
      </Grid>
      <FormTextField
        control={control}
        name="number_of_chains"
        label="Number of chains"
        defaultValue={defaultValues.number_of_chains}
        type="number"
      />
      </React.Fragment>
    ),

  ]

  return (
    <Dialog open={open} onClose={handleClose} maxWidth='md' fullWidth>
      <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
      <DialogContent className={classes.dialogPaper}>
        <Stepper activeStep={activeStep}>
          {steps.map((label, index) => {
            const stepProps = {};
            const labelProps = {};
            return (
              <Step key={label} {...stepProps}>
                <StepLabel {...labelProps}>{label}</StepLabel>
              </Step>
            );
          })}
        </Stepper>
        {stepRenders[activeStep]}
      </DialogContent>
      <DialogActions>
        <Button 
          color="inherit"
          disabled={activeStep === 0}
          onClick={handleBack}
        >
          Back
        </Button>
        {activeStep < steps.length - 1 && 
          <Button 
            onClick={handleNext}
          >
            Next
          </Button>
        }
        {activeStep === steps.length - 1 && 
          <Button 
            type="submit"
          >
            Run 
          </Button>
        }
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
      </form>
    </Dialog>
  )
}
