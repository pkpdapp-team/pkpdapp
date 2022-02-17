import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import Button from "@material-ui/core/Button";

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
  formInput: {
    margin: theme.spacing(1),
  },
}));

function PriorSubform({
  control,
  prior,
  index,
  variables,
  variable_options,
  type_options,
  remove,
  watch,
  setValue,
  disabled,
}) {
  const [type, setType] = useState(prior.type);
  const baseName = `priors[${index}]`
  
  const setDefaults = (type, variable) => {
    if (type === "PriorNormal") {
      setValue(`${baseName}.mean`, variable.default_value);
      const standardDeviation = Math.sqrt(
        Math.pow(variable.upper_bound - variable.lower_bound, 2) / 12
      );
      setValue(`${baseName}.sd`, standardDeviation);
    } else if (type === "PriorUniform") {
      setValue(`${baseName}.lower`, variable.lower_bound);
      setValue(`${baseName}.upper`, variable.upper_bound);
    }
  };
  const handleTypeChange = (event) => {
    const oldVar = watch.variable
    const newType = event.target.value;
    const variable = variables.find((v) => v.id === oldVar);
    if (variable) {
      setDefaults(newType, variable, baseName);
    }
    setType(newType)
  };
  const handleVariableChange = (event) => {
    const oldType = watch.type
    const newVariable = event.target.value;
    const variable = variables.find((v) => v.id === newVariable);
    if (variable) {
      setDefaults(oldType, variable, baseName);
    }
  };

  return (
    <ListItem key={prior.id} role={undefined} dense>
      <FormSelectField
        control={control}
        defaultValue={prior.type || ""}
        disabled={disabled}
        options={type_options}
        onChangeUser={handleTypeChange}
        name={`${baseName}.type`}
        label="Type"
      />
      <FormSelectField
        control={control}
        defaultValue={prior.variable || ""}
        disabled={disabled}
        options={variable_options}
        onChangeUser={handleVariableChange}
        name={`${baseName}.variable`}
        label="Variable"
      />

      {type === "PriorNormal" && (
        <React.Fragment>
          <FormTextField
            control={control}
            name={`${baseName}.mean`}
            defaultValue={prior.mean}
            disabled={disabled}
            label="Mean"
            type="number"
          />
          <FormTextField
            control={control}
            name={`${baseName}.sd`}
            disabled={disabled}
            defaultValue={prior.sd}
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
            defaultValue={prior.lower}
            label="Lower"
            type="number"
          />
          <FormTextField
            control={control}
            name={`${baseName}.upper`}
            defaultValue={prior.upper}
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


function PriorsSubform({
  control,
  objects,
  variables,
  append,
  remove,
  watch,
  setValue,
  disabled,
}) {
  const variable_options = variables
    .filter((variable) => variable.constant || variable.state)
    .map((variable) => ({ key: variable.qname.replace('.size', '.volume'), value: variable.id }));
  if (variable_options.length === 0) {
    return null;
  }
  const type_options = [
    { key: "Normal", value: "PriorNormal" },
    { key: "Uniform", value: "PriorUniform" },
  ];
  const handleNewPrior = () => {
    append({
      type: "PriorUniform",
      sd: "",
      mean: "",
      lower: "",
      upper: "",
      variable: "",
    });
  }

  return (
    <React.Fragment>
      <Typography>Parameter Priors</Typography>
      <List>
        {objects.map((prior, index) => (
          <PriorSubform
            key={index}
            control={control}
            prior={prior}
            index={index}
            variable_options={variable_options}
            variables={variables}
            type_options={type_options}
            remove={remove}
            watch={watch[index]}
            setValue={setValue}
            disabled={disabled}
          />
        ))}
        <ListItem key={-1} role={undefined} dense>
          <Tooltip title={`create new prior`} placement="right">
            <IconButton
              variant="rounded"
              disabled={disabled}
              onClick={handleNewPrior}
            >
              <AddIcon />
            </IconButton>
          </Tooltip>
        </ListItem>
      </List>
    </React.Fragment>
  );
}

function LogLikelihoodSubform({
  control,
  objects,
  variables,
  logLikelihood,
  biomarker_type_options,
  variable_options,
  form_options,
  append,
  index,
  remove,
  watch,
  setValue,
  disabled,
}) {

  const baseName = `objective_functions[${index}]`;
  const watchForm = watch[index].form;
  const watchVariable = watch[index].variable;
  
  const setDefaults = (form, variable) => {
    if (form === "N") {
      const standardDeviation = Math.sqrt(
        Math.pow(variable.upper_bound - variable.lower_bound, 2) / 12
      );
      setValue(`${baseName}.parameters[0].value`, standardDeviation);
    } else if (form === "LN") {
      const standardDeviation = Math.sqrt(
        Math.pow(variable.upper_bound - variable.lower_bound, 2) / 12
      );
      setValue(`${baseName}.parameters[0].value`, standardDeviation);
    }
  };
  const handleFormChange = (oldForm, oldVar) => (event) => {
    const newForm = event.target.value;
    const variable = variables.find((v) => v.id === oldVar);
    if (variable) {
      setDefaults(newForm, variable, baseName);
    } else {
      setValue(`${baseName}.parameters[0].value`, null);
      setValue(`${baseName}.parameters[0].value`, null);
    }
  };
  const handleVariableChange = (oldType, oldVar) => (event) => {
    const newVariable = event.target.value;
    const variable = variables.find((v) => v.id === newVariable);
    if (variable) {
      setDefaults(oldType, variable, baseName);
    }
  };
  

  return (
    <ListItem key={index} role={undefined} dense>
        <FormSelectField
          control={control}
          defaultValue={logLikelihood.form || ""}
          onChangeUser={handleFormChange(
            watchType,
            watchVariable,
            baseName
          )}
          disabled={disabled}
          options={form_options}
          name={`${baseName}.form`}
          label="Form"
        />
        <FormSelectField
          control={control}
          defaultValue={logLikelihood.variable || ""}
          onChangeUser={handleVariableChange(
            watchType,
            watchVariable,
            baseName
          )}
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
        {watchForm === "N" &&  && (
          <React.Fragment>
            <FormTextField
              control={control}
              name={`${baseName}.parameters[0].value`}
              defaultValue={objectiveFunction.sd}
              disabled={disabled}
              label="Standard Deviation"
              type="number"
            />
          </React.Fragment>
        )}
        {watchForm === "LN" && (
          <React.Fragment>
            <FormTextField
              control={control}
              name={`${baseName}.parameters[0].value`}
              disabled={disabled}
              defaultValue={objectiveFunction.sigma}
              label="Sigma"
              type="number"
            />
          </React.Fragment>
        )}
        <Tooltip title={`delete objective function`} placement="right">
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


function LogLikelihoodsSubform({
  control,
  objects,
  variables,
  biomarker_types,
  append,
  remove,
  watch,
  setValue,
  disabled,
}) {
  if (!biomarker_types || biomarker_types.length === 0) {
    return null;
  }
  const variable_options = variables
    .filter((variable) => !variable.constant)
    .map((variable) => ({ key: variable.qname, value: variable.id }));
  if (variable_options.length === 0) {
    return null;
  }
  const biomarker_type_options = biomarker_types.map((biomarker_type) => ({
    key: biomarker_type.name,
    value: biomarker_type.id,
  }));
  const form_options = [
    { key: "Normal", value: "N" },
    { key: "LogNormal", value: "LN" },
  ];
  
  const handleNewLoglikelihood = () => 
    append({
      form: "N",
      variable: "",
      biomarker_type: "",
    });
  return (
    <React.Fragment>
      <Typography>Objective Functions</Typography>
      <List>
        {objects.map((logLikelihood, index) => (
          <LogLikelihoodSubform
            key={index}
            control={control}
            logLikelihood={logLikelihood}
            index={index}
            variable_options={variable_options}
            biomarker_type_options={biomarker_type_options}
            variables={variables}
            form_options={form_options}
            remove={remove}
            watch={watch[index]}
            setValue={setValue}
            disabled={disabled}
          />
        ))}
        <ListItem key={-1} role={undefined} dense>
          <Tooltip title={`create new objective function`} placement="right">
            <IconButton
              variant="rounded"
              disabled={disabled}
              onClick={handleNewLoglikelihood}
            >
              <AddIcon />
            </IconButton>
          </Tooltip>
        </ListItem>
      </List>
    </React.Fragment>
  );
}

export default function DraftInferenceDetail({ project, inference }) {
  const dispatch = useDispatch();

  const { control, handleSubmit, watch, setValue } = useForm({
    defaultValues: inference,
  });

  const datasets = useSelector(selectAllDatasets);
  const datasets_options = datasets.map((dataset) => ({
    key: dataset.name,
    value: dataset.id,
  }));
  const defaultBiomarkerType = useSelector((state) =>
    inference.objective_functions.length > 0
      ? selectBiomarkerTypeById(
          state,
          inference.objective_functions[0].biomarker_type
        )
      : undefined
  );
  const defaultDataset = defaultBiomarkerType
    ? defaultBiomarkerType.dataset
    : "";
  const [dataset, setDataset] = useState(defaultDataset);
  const handleDatasetChange = (event) => {
    const value = event.target.value;
    setDataset(value);
    setValue("objective_functions", inference.objective_functions);
  };
  const biomarker_types = useSelector((state) =>
    dataset ? selectBiomarkerTypesByDatasetId(state, dataset) : []
  );
  const classes = useStyles();

  const {
    fields: priors,
    append: priorsAppend,
    remove: priorsRemove,
  } = useFieldArray({
    control,
    name: "priors",
  });
  const {
    fields: objectiveFunctions,
    append: objectiveFunctionsAppend,
    remove: objectiveFunctionsRemove,
  } = useFieldArray({
    control,
    name: "objective_functions",
  });

  const [modelType, setModelType] = useState("PD");
  const handleModelTypeChange = (event) => {
    const value = event.target.value;
    setModelType(value);
    setValue("objective_functions", inference.objective_functions);
    setValue("priors", inference.priors);
  };
  const handleModelChange = (event) => {
    setValue("objective_functions", inference.objective_functions);
    setValue("priors", inference.priors);
  };
  const watchPdModel = watch("pd_model");
  const watchPkModel = watch("dosed_pk_model");
  const watchPriors = watch("priors");
  const watchObjectiveFunctions = watch("objective_functions");

  const variables = useSelector((state) => {
    if (modelType === "PD") {
      return selectVariablesByPdModel(state, watchPdModel);
    } else if (modelType === "PK") {
      return selectVariablesByDosedPkModel(state, watchPkModel);
    }
  });

  const handleDelete = () => {
    dispatch(deleteInference(inference.id));
  };

  const handleRun = () => {
    dispatch(runInference(inference.id));
  };

  const handleStop= () => {
    dispatch(stopInference(inference.id));
  };

  useEffect(() => {
    if (inference.pd_model) {
      setModelType("PD");
    } else if (inference.dosed_pk_model) {
      setModelType("PK");
    }
  }, [inference.pd_model, inference.dosed_pk_model]);

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

      <FormControl className={classes.formInput}>
        <InputLabel id="dataset-label">Dataset</InputLabel>
        <Select
          labelId="model-type-label"
          onChange={handleDatasetChange}
          disabled={readOnly}
          value={dataset}
        >
          {datasets_options.map((option, i) => {
            return (
              <MenuItem key={i} value={option.value}>
                {option.key}
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>

      <div className={classes.modelSelect}>
        <FormControl className={classes.formInput}>
          <InputLabel id="model-type-label">Model Type</InputLabel>
          <Select
            labelId="model-type-label"
            onChange={handleModelTypeChange}
            value={modelType}
            disabled={readOnly}
          >
            {model_type_options.map((option, i) => {
              return (
                <MenuItem key={i} value={option.value}>
                  {option.key}
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>

        {modelType === "PK" && (
          <FormSelectField
            control={control}
            defaultValue={inference.dosed_pk_model || ""}
            disabled={readOnly}
            onChangeUser={handleModelChange}
            options={dosed_pk_model_options}
            name="dosed_pk_model"
            label="Dosed Pharmacokinetic Model"
          />
        )}

        {modelType === "PD" && (
          <FormSelectField
            control={control}
            defaultValue={inference.pd_model || ""}
            disabled={readOnly}
            onChangeUser={handleModelChange}
            options={pd_model_options}
            name="pd_model"
            label="Pharmacodynamic Model"
          />
        )}
      </div>

      <PriorsSubform
        control={control}
        objects={priors}
        variables={variables}
        disabled={readOnly}
        append={priorsAppend}
        remove={priorsRemove}
        watch={watchPriors}
        setValue={setValue}
      />

      <LogLikelihoodsSubform
        control={control}
        objects={objectiveFunctions}
        variables={variables}
        append={objectiveFunctionsAppend}
        disabled={readOnly}
        remove={objectiveFunctionsRemove}
        biomarker_types={biomarker_types}
        watch={watchObjectiveFunctions}
        setValue={setValue}
      />

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
