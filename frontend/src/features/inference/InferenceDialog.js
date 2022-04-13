import React, { useEffect, useState, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useForm, useFieldArray } from "react-hook-form";
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core//DialogTitle';
import Button from '@material-ui/core/Button';
import Grid from "@material-ui/core/Grid";
import Stepper from '@material-ui/core/Stepper';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';
import Typography from '@material-ui/core/Typography';

import { FormTextField, FormSelectField, FormSliderField } from "../forms/FormComponents";
import { selectAllAlgorithms } from "../inference/algorithmsSlice";
import { selectAllDatasets } from "../datasets/datasetsSlice";
import { updateInference, deleteInference, selectAllInferences } from "../inference/inferenceSlice";
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






export default function InferenceDialog({ project, open, handleClose }) {
  const dispatch = useDispatch();

  const [activeStep, setActiveStep] = React.useState(0);

  const steps = [
    'Inference options', 
    'Model and dataset', 
    'Observables',
    'Parameters',
  ];

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
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

  

  const defaultValues = {
    project: project.id, 
    algorithm: 1, 
    initialization_strategy: 'R',
    initialization_inference: '',
    number_of_chains: 4,
    max_number_of_iterations: 1000,
    model: '',
    dataset: '',
  }

  const { control, handleSubmit, watch, setValue } = useForm({
    defaultValues
  });

  const modelId = watch("model")
  const datasetId = watch("dataset")

  const variablesAll = useSelector((state) => {
    if (modelId) {
      const modelIdParse = JSON.parse(modelId)
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
    value: biomarker_type.id,
  })).concat([
    {key: "None", value: ""}
  ]);


  const datasets = useSelector(selectAllDatasets);
  const dataset_options = datasets.map((dataset) => ({
    key: dataset.name,
    value: dataset.id,
  })).concat([
    { key: 'Use simulated data', value: '' }
  ]);

  const inferences = useSelector(selectAllInferences);
  const inference_options = inferences.map((inference) => ({
    key: inference.name,
    value: inference.id,
  })).concat([
    { key: "None", value: "" } 
  ]);

  const {
    fields: observations,
    append: observationsAppend,
    remove: observationsRemove,
  } = useFieldArray({
    control,
    name: "observations",
  });

  const {
    fields: parameters,
    append: parametersAppend,
    remove: parametersRemove,
  } = useFieldArray({
    control,
    name: "parameters",
  });

  const onSubmit = (values) => {
    dispatch(updateInference(values));
  };

  

  const max_number_of_iterations = watch(
    "max_number_of_iterations"
  )


  const stepRenders = [
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
      </React.Fragment>
    ),
    (
      <React.Fragment>
      {observations.map((obs, index) => {
      }}
      </React.Fragment>
    ),
    (
      <React.Fragment>
      {parameters.map((param, index) => {
      }}
      </React.Fragment>
    ),

  ]



 
  return (
    <Dialog open={open} onClose={handleClose}>
      <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
      <DialogContent>
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
        <Button 
          onClick={handleNext}
        >
         {activeStep === steps.length - 1 ? 'Finish' : 'Next'}
        </Button>

        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
      </form>
    </Dialog>
  )
}
