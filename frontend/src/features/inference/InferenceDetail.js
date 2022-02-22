import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import Divider from '@material-ui/core/Divider';
import Button from "@material-ui/core/Button";
import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";

import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import Alert from "@material-ui/lab/Alert";
import { useForm, useFieldArray } from "react-hook-form";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import Tooltip from "@material-ui/core/Tooltip";
import Select from "@material-ui/core/Select";
import IconButton from "@material-ui/core/IconButton";
import MenuItem from "@material-ui/core/MenuItem";
import AddIcon from "@material-ui/icons/Add";
import DeleteIcon from "@material-ui/icons/Delete";

import { selectAllPkModels } from "../pkModels/pkModelsSlice";
import { selectAllPdModels } from "../pdModels/pdModelsSlice";
import { selectAllAlgorithms } from "../inference/algorithmsSlice";

import {
  selectBiomarkerTypesByDatasetId,
  selectBiomarkerTypeById,
} from "../datasets/biomarkerTypesSlice";

import {
  selectVariablesByPdModel,
  selectVariablesByDosedPkModel,
  selectVariableById,
} from "../variables/variablesSlice";

import { selectAllDatasets } from "../datasets/datasetsSlice";

import { updateInference, deleteInference } from "../inference/inferenceSlice";
import { runInference, stopInference } from "./inferenceSlice";
import { FormTextField, FormSelectField } from "../forms/FormComponents";
import { userHasReadOnlyAccess } from "../projects/projectsSlice";

const useStyles = makeStyles((theme) => ({
  controlsRoot: {
    display: "flex",
    alignItems: "center",
  },
  controls: {
    margin: theme.spacing(1),
  },
  modelSelect: {
    display: "flex",
  },
  components: {
    width: "100%",
  },
  root: {
    width: '100%',
  },
  formRoot: {
    display: "flex",
    '& .MuiFormControl-root': { flex: 1 },
  },
  
  formInput: {
    margin: theme.spacing(1),
    flex: 1,
  },
}));

function PriorSubform({
  control,
  prior,
  index,
  variable,
  log_likelihood_parameter,
  baseName,
  remove,
  watch,
  setValue,
  disabled,
}) {
  const [type, setType] = useState(prior.type);

  const type_options = [
    { key: "Normal", value: "PriorNormal" },
    { key: "Uniform", value: "PriorUniform" },
  ];
  
  const handleTypeChange = (event) => {
    const newType = event.target.value;
    setType(newType)
  };

  return (
    <ListItem key={prior.id} role={undefined}>
      <Typography>
        {variable ? variable.name : log_likelihood_parameter.name} prior
      </Typography>
      <FormSelectField
        control={control}
        defaultValue={prior.type || ""}
        disabled={disabled}
        options={type_options}
        onChangeUser={handleTypeChange}
        name={`${baseName}.type`}
        label="Type"
      />
      {type === "PriorNormal" && (
        <React.Fragment>
          <FormTextField
            control={control}
            name={`${baseName}.mean`}
            defaultValue={prior.mean || ""}
            disabled={disabled}
            label="Mean"
            type="number"
          />
          <FormTextField
            control={control}
            name={`${baseName}.sd`}
            disabled={disabled}
            defaultValue={prior.sd || ""}
            label="Standard Deviation"
            type="number"
          />
        </React.Fragment>
      )}
      {type === "PriorUniform" && (
        <React.Fragment>
          <FormTextField
            control={control}
            name={`${baseName}.lower`}
            disabled={disabled}
            defaultValue={prior.lower || ""}
            label="Lower"
            type="number"
          />
          <FormTextField
            control={control}
            name={`${baseName}.upper`}
            defaultValue={prior.upper || ""}
            disabled={disabled}
            label="Upper"
            type="number"
          />
        </React.Fragment>
      )}

      <Tooltip title={`delete prior`} placement="right">
        <IconButton
          variant="rounded"
          disabled={disabled}
          onClick={() => remove(index)}
        >
          <DeleteIcon />
        </IconButton>
      </Tooltip>
    </ListItem>
  );
}


function LogLikelihoodSubform({
  control,
  objects,
  logLikelihood,
  datasets,
  datasetOptions,
  models,
  modelOptions,
  baseName,
  remove,
  watch,
  setValue,
  disabled,
}) {

  const classes = useStyles();
  const watchForm = watch(`${baseName}.form`);
  const watchVariable = watch(`${baseName}.variable`);

  const variable = useSelector((state) => {
    if (watchVariable) {
        return selectVariableById(state, watchVariable);
    }
  });

  

  let variableModelType = null
  let variableModelId = null
  if (variable.pd_model) {
    variableModelType = 'PD'
    variableModelId = variable.pd_model
  } else if (variable.dosed_pk_model) {
    variableModelType = 'PK'
    variableModelId = variable.dosed_pd_model
  }

  const {
    fields: priors,
    append: priorsAppend,
    remove: priorsRemove,
  } = useFieldArray({
    control,
    name: `${baseName}.priors`,
  });

  // model 
  
  const [modelId, setModelId] = useState(
    variableModelId ? 
      `${variableModelId}:${variableModelType}`
      : null
  );
  const pd_models = useSelector(selectAllPdModels);
  const dosed_pk_models = useSelector(selectAllPkModels);
  const model_options = pd_models.map((model) => ({
    key: model.name,
    value: `${model.id}:PD`,
    group: 'Pharmacodynamic',
  })).concat(dosed_pk_models.map((model) => ({
    key: model.name,
    value: `${model.id}:PK`,
    group: 'Pharmacokinetic',
  })));

  const modelIdParse = modelId ? parseInt(modelId.split(':')[0]) : null
  const modelType = modelId ? modelId.split(':')[1] : null

  console.log('model_options', model_options, 'modelId', modelId, modelIdParse, modelType)
  const model = modelId ? 
    modelType == 'PD' ?
        pd_models.find(m => m.id === modelIdParse)
      :
        dosed_pk_models.find(m => m.id === modelIdParse)
    : null

  const handleModelChange = (event) => {
    const value = event.target.value;
    console.log('handleModelChange', value)
    setModelId(value)
    setValue("priors", logLikelihood.priors);
  };

  // model variables
  const variables = useSelector((state) => {
    if (modelId) {
      if (modelType === 'PD') {
        return selectVariablesByPdModel(state, modelIdParse);
      } else if (modelType === 'PK') {
        return selectVariablesByDosedPkModel(state, modelIdParse);
      }
    } else {
      return [];
    }
  }).filter(variable => variable.name !== "time");
  console.log('variables', variables)



  const variable_options = variables ? variables
    .filter((variable) => variable.name !== "time" && (variable.state))
    .map((variable) => ({ key: variable.qname.replace('.size', '.volume'), value: variable.id }))
  : []
      
  // dataset
  const biomarker_type = useSelector((state) => {
    if (logLikelihood.biomarker_type) {
        return selectBiomarkerTypeById(
          state, logLikelihood.biomarker_type
        );
    }
  });
  const [datasetId, setDatasetId] = useState(biomarker_type.dataset);
  const handleDatasetChange = (event) => {
    const value = event.target.value;
    setDatasetId(value);
  };

  // dataset biomarkers
  const biomarker_types = useSelector((state) =>
    datasetId ? selectBiomarkerTypesByDatasetId(state, datasetId) : []
  );
  const biomarker_type_options = biomarker_types.map((biomarker_type) => ({
    key: biomarker_type.name,
    value: biomarker_type.id,
  }));

  
  const form_options = [
    { key: "Normal", value: "N" },
    { key: "LogNormal", value: "LN" },
  ];
  
  const setDefaults = (form, variable) => {
    console.log('setDefaults', form, variable)
    if (form === "N") {
      const standardDeviation = Math.sqrt(
        Math.pow(variable.upper_bound - variable.lower_bound, 2) / 12
      );
      setValue(`${baseName}.parameters[0].name`, 'SD');
      setValue(`${baseName}.parameters[0].value`, standardDeviation);
    } else if (form === "LN") {
      const standardDeviation = Math.sqrt(
        Math.pow(variable.upper_bound - variable.lower_bound, 2) / 12
      );
      setValue(`${baseName}.parameters[0].name`, 'SI');
      setValue(`${baseName}.parameters[0].value`, standardDeviation);
    }
  };
  const handleFormChange = (event) => {
    const newForm = event.target.value;
    if (variable) {
      setDefaults(newForm, variable);
    }
  };
  const handleVariableChange = (event) => {
    const newVariable = event.target.value;
    if (variable) {
      setDefaults(watchForm, variable);
    }
  };

  const handleNewPrior = (variable) => (() => {
    console.log('adding new prior', variable)
    return (
      priorsAppend({
        type: "PriorUniform",
        sd: Math.sqrt(
          Math.pow(variable.upper_bound - variable.lower_bound, 2),
        ) / 12.0,
        mean: variable.default_value,
        lower: variable.lower_bound,
        upper: variable.upper_bound,
        variable: variable.id,
      })
    )
  });

  const handleNewParamPrior = (baseName) => (() => {
    console.log('adding new param prior', baseName)
    setValue(`${baseName}.prior`, 
      {
        type: "PriorUniform",
        sd: Math.sqrt(
          Math.pow(variable.upper_bound - variable.lower_bound, 2),
        ) / 12.0,
        mean: variable.default_value,
        lower: variable.lower_bound,
        upper: variable.upper_bound,
      }
    );
  });


  const handleRemoveParamPrior = (baseName) => (() => {
    console.log('remove param prior', baseName)
    setValue(`${baseName}.prior`, null);
  });

  return (
    <ListItem  role={undefined} dense>
      <Paper className={classes.root}>
      <Grid container spacing={1}>
      <Grid item xs={11}>
      <Grid item xs={12} className={classes.formRoot}>
      <FormControl className={classes.formInput}>
        <InputLabel id="dataset-label">Dataset</InputLabel>
        <Select
          labelId="dataset-label"
          onChange={handleDatasetChange}
          disabled={disabled}
          value={datasetId}
        >
          {datasetOptions.map((option, i) => {
            return (
              <MenuItem key={i} value={option.value}>
                {option.key}
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>
      <FormControl className={classes.formInput}>
        <InputLabel id="model-label">Model</InputLabel>
        <Select
          labelId="model-label"
          onChange={handleModelChange}
          disabled={disabled}
          value={modelId}
        >
          {model_options.map((option, i) => {
            return (
              <MenuItem key={i} value={option.value}>
                {option.key}
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>
      </Grid>
      <Grid item xs={12} className={classes.formRoot}>
      <FormSelectField
        control={control}
        defaultValue={logLikelihood.form || ""}
        onChangeUser={handleFormChange}
        disabled={disabled}
        options={form_options}
        name={`${baseName}.form`}
        label="Form"
      />
      <FormSelectField
        control={control}
        defaultValue={logLikelihood.variable || ""}
        onChangeUser={handleVariableChange}
        disabled={disabled}
        options={variable_options}
        name={`${baseName}.variable`}
        label="Variable"
      />
      <FormSelectField
        control={control}
        defaultValue={logLikelihood.biomarker_type || ""}
        options={biomarker_type_options}
        disabled={disabled}
        name={`${baseName}.biomarker_type`}
        label="Biomarker Type"
      />
      </Grid>
      <Grid item xs={12}>
      <Typography>Log-likelihood Parameters</Typography>
        {logLikelihood.parameters.map((param, index) => {
          
          const paramBaseName = `${baseName}.parameters[${index}]`;
          const watchParam = watch(`${paramBaseName}`)
          const prior = watchParam.prior
          if (prior) {
            return (
              <PriorSubform
                key={variables.length + index}
                control={control}
                prior={prior}
                baseName={paramBaseName + `.prior`}
                log_likelihood_parameter={param}
                remove={handleRemoveParamPrior(paramBaseName)}
                setValue={setValue}
                disabled={disabled}
              />
            )
          } else {
            return (
              <ListItem key={variables.length + index} dense>
              <FormTextField
                control={control}
                name={`${baseName}.parameters[${index}].value`}
                disabled={disabled}
                defaultValue={param.value || ""}
                label={watchParam.name}
                type="number"
              />
              <Tooltip title={`create new prior`} placement="right">
                <IconButton
                  variant="rounded"
                  disabled={disabled}
                  onClick={handleNewParamPrior(
                    `${baseName}.parameters[${index}]`
                  )}
                >
                  <AddIcon />
                </IconButton>
              </Tooltip>
              </ListItem>
            )
          }
        })}
      <Typography>Variables</Typography>
      <List>
        {variables.map((variable, index) => {
          const priorIndex = priors.findIndex(
            p => p.variable === variable.id
          );
          const prior = priors[priorIndex];
          if (prior) {
            return (
              <PriorSubform
                key={index}
                control={control}
                prior={prior}
                variable={variable}
                baseName={baseName + `.priors[${index}]`}
                remove={() => priorsRemove(priorIndex)}
                setValue={setValue}
                disabled={disabled}
              />
            )
          } else {
            return (
              <ListItem key={index} dense>
              <Typography>{variable.name} = {variable.default_value}</Typography>
              <Tooltip title={`create new prior`} placement="right">
                <IconButton
                  variant="rounded"
                  disabled={disabled}
                  onClick={handleNewPrior(variable)}
                >
                  <AddIcon />
                </IconButton>
              </Tooltip>
              </ListItem>
            )
          }
        }
        )}
        
      </List>
      </Grid>
      </Grid>
      <Grid item xs={1}>
      <Tooltip title={`delete log-likelihood`} placement="right">
        <IconButton
          variant="rounded"
          disabled={disabled}
          onClick={() => remove()}
        >
          <DeleteIcon />
        </IconButton>
      </Tooltip>
      </Grid>
      </Grid>
    </Paper>
    </ListItem>

  );
}

export default function DraftInferenceDetail({ project, inference }) {
  const dispatch = useDispatch();

  const { control, handleSubmit, watch, setValue } = useForm({
    defaultValues: inference,
  });

  const datasets = useSelector(selectAllDatasets);
  const dataset_options = datasets.map((dataset) => ({
    key: dataset.name,
    value: dataset.id,
  }));

  

  const classes = useStyles();

  
  const {
    fields: logLikelihoods,
    append: logLikelihoodsAppend,
    remove: logLikelihoodsRemove,
  } = useFieldArray({
    control,
    name: "log_likelihoods",
  });
  const watchLogLikelihoods = watch("log_likelihoods");
  console.log('logLikelihoods', logLikelihoods)
  console.log('watchlogLikelihoods', watchLogLikelihoods)


  const handleDelete = () => {
    dispatch(deleteInference(inference.id));
  };

  const handleRun = () => {
    dispatch(runInference(inference.id));
  };

  const handleStop= () => {
    dispatch(stopInference(inference.id));
  };

  const handleNewLoglikelihood = () => 
    logLikelihoodsAppend({
      form: "N",
      variable: "",
      priors: [],
      parameters: [
        {
          name: 'SD',
          value: null,
          prior: null,
        }
      ],
      biomarker_type: "",
    });

  

  const onSubmit = (values) => {
    dispatch(updateInference(values));
  };

  const readOnly = userHasReadOnlyAccess(project) || inference.read_only;

  const algorithms = useSelector(selectAllAlgorithms);
  const algorithm_options = algorithms
    ? algorithms.map((algorithm) => ({
        key: algorithm.name,
        value: algorithm.id,
        group: algorithm.category === "SA" ? "Sampling" : "Optimisation",
      }))
    : [{ key: "Loading...", value: null, group: null }];

  const model_type_options = [
    { key: "Pharmacodynamic", value: "PD" },
    { key: "Pharmacokinetic", value: "PK" },
  ];

  const initialization_options = [
    { key: "Random from prior", value: "R" },
    { key: "Default value from model", value: "D" },
  ]

  const pdModels = useSelector(selectAllPdModels);
  const pd_model_options = pdModels
    ? pdModels
        .map((pd) => ({ key: pd.name, value: pd.id }))
        .concat([{ key: "None", value: "" }])
    : [{ key: "Loading...", value: null }];

  const pkModels = useSelector(selectAllPkModels);
  const dosed_pk_model_options = pkModels
    ? pkModels
        .map((pk) => ({ key: pk.name, value: pk.id }))
        .concat([{ key: "None", value: "" }])
    : [{ key: "Loading...", value: null }];

  return (
    <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
      <FormTextField
        control={control}
        name="name"
        label="Name"
        disabled={readOnly}
      />

      <FormTextField
        control={control}
        fullWidth
        disabled={readOnly}
        multiline
        name="description"
        label="Description"
      />


      <Typography>Log-likelihoods</Typography>
      <List>
        {logLikelihoods.map((logLikelihood, index) => (
          <LogLikelihoodSubform
            key={index}
            control={control}
            logLikelihood={logLikelihood}
            datasets={datasets}
            datasetOptions={dataset_options}
            remove={() => logLikelihoodsRemove(index)}
            baseName = {`log_likelihoods[${index}]`}
            watch={watch}
            setValue={setValue}
            disabled={readOnly}
          />
        ))}
        <ListItem key={-1} role={undefined} dense>
          <Tooltip title={`create new objective function`} placement="right">
            <IconButton
              variant="rounded"
              disabled={readOnly}
              onClick={handleNewLoglikelihood}
            >
              <AddIcon />
            </IconButton>
          </Tooltip>
        </ListItem>
      </List>

      <FormSelectField
        control={control}
        defaultValue={inference.algorithm}
        disabled={readOnly}
        useGroups
        options={algorithm_options}
        name="algorithm"
        label="Algorithm"
      />

      <FormSelectField
        control={control}
        defaultValue={inference.initialization_strategy}
        disabled={readOnly}
        useGroups
        options={initialization_options}
        name="initialization_strategy"
        label="Initialization Strategy"
      />

      <FormTextField
        control={control}
        name="max_number_of_iterations"
        label="Maximum iterations"
        disabled={readOnly}
        type="number"
      />

      <FormTextField
        control={control}
        disabled={readOnly}
        name="number_of_chains"
        label="Number of chains"
        type="number"
      />

      <div className={classes.controlsRoot}>
        <Button
          className={classes.controls}
          type="submit"
          disabled={readOnly}
          variant="contained"
        >
          Save
        </Button>
        <Button
          className={classes.controls}
          disabled={readOnly}
          onClick={handleRun}
          variant="contained"
        >
          Run
        </Button>
        <Button
          className={classes.controls}
          disabled={readOnly}
          onClick={handleStop}
          variant="contained"
        >
          Stop
        </Button>
        <Button
          className={classes.controls}
          variant="contained"
          onClick={handleDelete}
          disabled={false}
        >
          Delete
        </Button>
      </div>

      {inference.errors &&
        inference.errors.map((error, index) => (
          <Alert key={index} severity="error">
            {error}
          </Alert>
        ))}
    </form>
  );
}
