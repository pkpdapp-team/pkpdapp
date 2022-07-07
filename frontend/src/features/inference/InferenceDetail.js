import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import Divider from '@material-ui/core/Divider';
import Button from "@material-ui/core/Button";
import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";

import FormControl from "@material-ui/core/FormControl";
import ReactFlow, { MarkerType, applyEdgeChanges, applyNodeChanges } from 'react-flow-renderer';
import * as ELK from 'elkjs';
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


import InferenceDialog from "./InferenceDialog";

import { selectWritablePkModels, selectReadOnlyPkModels } from "../pkModels/pkModelsSlice";
import { selectWritablePdModels, selectReadOnlyPdModels } from "../pdModels/pdModelsSlice";
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

import { updateInference, deleteInference, selectAllInferences } from "../inference/inferenceSlice";
import { runInference, stopInference } from "./inferenceSlice";
import { FormTextField, FormSelectField, FormSliderField } from "../forms/FormComponents";
import { userHasReadOnlyAccess } from "../projects/projectsSlice";

const elk = new ELK()

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
  graph: {
    height: "30vh",
    width: "100%",
  },
}));


function variableGetDefaultValue(variable) {
  if (variable.is_log) {
    return Math.exp(variable.default_value)
  } else {
    return variable.default_value
  }
}

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
        <span>
        <IconButton
          variant="rounded"
          disabled={disabled}
          onClick={() => remove(index)}
        >
          <DeleteIcon />
        </IconButton>
        </span>
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
  const {
    fields: parameters,
    replace: parametersReplace,
  } = useFieldArray({
    control,
    name: `${baseName}.parameters`,
  });

  const variable = useSelector((state) => {
    if (watchVariable) {
        return selectVariableById(state, watchVariable);
    }
  });

  let variableModelType = null
  let variableModelId = null
  if (logLikelihood.pd_model) {
    variableModelType = 'PD'
    variableModelId = logLikelihood.pd_model
  }
  if (logLikelihood.dosed_pk_model) {
    variableModelType = 'PK'
    variableModelId = logLikelihood.dosed_pk_model
  }
    
  const defaultModelID = variableModelId ? 
      `${variableModelId}:${variableModelType}`
      : ''

  // model 
  
  const [modelId, setModelId] = useState(defaultModelID);
  const [changedModel, setChangedModel] = useState(false);
  const pd_models = useSelector(state => 
    disabled ? selectReadOnlyPdModels(state) : selectWritablePdModels(state)
  );
  const dosed_pk_models = useSelector(state => 
    disabled ? selectReadOnlyPkModels(state) : selectWritablePkModels(state)
  );
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

  const model = modelId ? 
    modelType == 'PD' ?
        pd_models.find(m => m.id === modelIdParse)
      :
        dosed_pk_models.find(m => m.id === modelIdParse)
    : null

  // model variables
  const variablesAll = useSelector((state) => {
    if (modelId) {
      if (modelType === 'PD') {
        return selectVariablesByPdModel(state, modelIdParse);
      } else if (modelType === 'PK') {
        return selectVariablesByDosedPkModel(state, modelIdParse);
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

  useEffect(() => {
    if (defaultModelID === modelId && !changedModel) {
      return
    }
    const noise_params = [
      {
        name: 'standard deviation',
        value: null,
        prior: null
      }
    ]
    const model_params = variables.filter(variable => 
      variable.constant || variable.state
    ).map(variable => ({
      name: variable.qname, 
      value: variableGetDefaultValue(variable),
      variable: variable.id,
      prior: null,
    }))
    parametersReplace(noise_params.concat(model_params))
    }
  , [JSON.stringify(variables)]);


  const handleModelChange = (event) => {
    const value = event.target.value;
    setChangedModel(true)
    setModelId(value)
  };

  
  const variable_options = variables ? variables
    .filter((variable) => 
      variable.name !== "time" && (!variable.constant)
    ).map((variable) => 
      ({ 
        key: variable.qname.replace('.size', '.volume'), 
        value: variable.id 
      })
    )
  : []
      
  // dataset
  const [datasetId, setDatasetId] = useState(logLikelihood.dataset || '');
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
  })).concat([
    {key: "None", value: ""}
  ]);

  
  const form_options = [
    { key: "Normal", value: "N" },
    { key: "LogNormal", value: "LN" },
  ];
  
  const setDefaults = (form, variable) => {
    if (form === "N") {
      const standardDeviation = Math.sqrt(
        Math.pow(variable.upper_bound - variable.lower_bound, 2) / 12
      );
      setValue(`${baseName}.parameters[0].name`, 'standard deviation');
      setValue(`${baseName}.parameters[0].value`, standardDeviation);
    } else if (form === "LN") {
      const standardDeviation = Math.sqrt(
        Math.pow(variable.upper_bound - variable.lower_bound, 2) / 12
      );
      setValue(`${baseName}.parameters[0].name`, 'sigma');
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
    if (newVariable) {
      setDefaults(watchForm, newVariable);
    }
  };

  
  const handleNewParamPrior = (param, baseName) => (() => {
    if (param.variable) {
      const variable = variables.find(v => v.id === param.variable)
      setValue(`${baseName}.prior`, 
        {
          type: "PriorUniform",
          sd: Math.sqrt(
            Math.pow(variable.upper_bound - variable.lower_bound, 2),
          ) / 12.0,
          mean: variableGetDefaultValue(variable),
          lower: variable.lower_bound,
          upper: variable.upper_bound,
        }
      );
    } else {
      if (variable) {
        setValue(`${baseName}.prior`, 
          {
            type: "PriorUniform",
            sd: Math.sqrt(
              Math.pow(variable.upper_bound - variable.lower_bound, 2),
            ) / 12.0,
            mean: variableGetDefaultValue(variable),
            lower: variable.lower_bound,
            upper: variable.upper_bound,
          }
        );
      } else {
        setValue(`${baseName}.prior`, 
          {
            type: "PriorUniform",
            sd: param.value,
            mean: param.value,
            lower: param.value,
            upper: param.value,
          }
        );
      }
    }
  });


  const handleRemoveParamPrior = (baseName) => (() => {
    setValue(`${baseName}.prior`, null);
  });

  return (
    <ListItem  role={undefined} dense>
      <Paper className={classes.root}>
      <Grid container spacing={1}>
      <Grid item xs={11}>
      <Grid item xs={12} className={classes.formRoot}>
      <FormControl className={classes.formInput}>
        <InputLabel id="dataset-label" shrink={true}>
        Dataset
        </InputLabel>
        <Select
          labelId="dataset-label"
          onChange={handleDatasetChange}
          disabled={disabled}
          value={datasetId}
          displayEmpty
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
        displayEmpty
        disabled={disabled}
        name={`${baseName}.biomarker_type`}
        label="Biomarker Type"
      />
      </Grid>
      <Grid item xs={12}>
      <Typography>Log-likelihood Parameters</Typography>
        {parameters.map((param, index) => {
          
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
                name={`${paramBaseName}.value`}
                disabled={disabled}
                defaultValue={param.value || ""}
                label={watchParam.name}
                type="number"
              />
              <Tooltip title={`create new prior`} placement="right">
                <span>
                <IconButton
                  variant="rounded"
                  disabled={disabled}
                  onClick={handleNewParamPrior(
                    watchParam, `${baseName}.parameters[${index}]`
                  )}
                >
                  <AddIcon />
                </IconButton>
                </span>
              </Tooltip>
              </ListItem>
            )
          }
        })}
      </Grid>
      </Grid>
      <Grid item xs={1}>
      <Tooltip title={`delete log-likelihood`} placement="right">
        <span>
        <IconButton
          variant="rounded"
          disabled={disabled}
          onClick={() => remove()}
        >
          <DeleteIcon />
        </IconButton>
        </span>
      </Tooltip>
      </Grid>
      </Grid>
    </Paper>
    </ListItem>

  );
}

export default function InferenceDetail({ project, inference }) {
  const dispatch = useDispatch();
  const [openDialog, setOpenDialog] = React.useState(false);
  const handleCloseDialog = () => {
    setOpenDialog(false);
  };
  const handleEdit = () => {
    setOpenDialog(true);
  };

  let logLikelihoodNodes = inference.log_likelihoods.map(ll => {
    let label = (<>ll.name</>)
    let border = 'solid';
    let width = 140;
    let height = 40;
    let type = 'default';
    let observed = '';
    if (ll.observed) {
      observed = 'Observed '
      type = 'input'
    }
    if (ll.form === 'F') {
      type = 'output'
    }
    if (ll.form === 'M') {
      label = (<><strong>Model:</strong> {ll.name}</>); 
      border = '5px double';
      height = 2 * height;
    } else if (ll.form === 'N') {
      label = (<><strong>{observed}Normal</strong></>); 
    } else if (ll.form === 'LN') {
      label = (<><strong>{observed}LogNormal</strong></>); 
    } else if (ll.form === 'U') {
      label = (<><strong>{observed}Uniform</strong></>); 
    } else if (ll.form === 'F') {
      label = `${ll.value}`
      width = 0.6 * width;
    }
    return {
      id: `${ll.id}`,
      data: { label },
      position: { x: 0, y: 0 },
      type,
      style: {
        background: '#D6D5E6',
        color: '#333',
        border,
        width,
        height,
      },
    }
  });

  const parameterEdges = inference.log_likelihoods.reduce((sum, ll) => 
    sum.concat(ll.parameters.map(p => ({
      id: `e-${p.id}`,
      source: `${p.parent}`,
      target: `${p.child}`,
      label: p.length ?  `${p.name} (${p.length},)` : `${p.name}`,
      type: 'default',
      animated: false,
      style: {
        'stroke-width': p.length ? '3px' : '1px',
      }
    }))), []);

  const [nodes, setNodes] = useState(null);
  const [edges, setEdges] = useState(parameterEdges);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );

  useEffect(() => {
    const graph = {
      id: "root",
      layoutOptions: { 
        'elk.algorithm': 'layered',
        'elk.nodePlacement.strategy': 'NETWORK_SIMPLEX',
        'elk.direction': 'DOWN',
        'elk.spacing.nodeNode': 20,
        'elk.layered.spacing.nodeNodeBetweenLayers': 90,
        'elk.aspectRatio': 1.0,
      },
      children: logLikelihoodNodes.map(n => (
        { id: n.id, width: n.style.width, height: n.style.height}
      )),
      edges: parameterEdges.map(e => (
        { id: e.id, sources: [e.source], targets: [e.target] }
      )),
    }

    elk.layout(graph).then(graph => {
      const newNodes = logLikelihoodNodes.map((n, i) => {
        n.position.x = graph.children[i].x
        n.position.y = graph.children[i].y
        return n;
      })
      setNodes(newNodes)
      setEdges(parameterEdges)
    })

  }, [JSON.stringify(inference.metadata)]);

  const logLikelihoodsNoNull = inference.log_likelihoods.map(ll =>
    Object.keys(ll).reduce((sum, key) => {
      sum[key] = ll[key] || ""
      return sum
    }, {}))
  const { control, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      ...inference,
      initialization_inference: inference.initialization_inference || "",
      log_likelihoods: logLikelihoodsNoNull
    },
  });

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

  const classes = useStyles();

  
  const {
    fields: logLikelihoods,
    append: logLikelihoodsAppend,
    remove: logLikelihoodsRemove,
  } = useFieldArray({
    control,
    name: "log_likelihoods",
  });


  const handleDelete = () => {
    dispatch(deleteInference(inference.id));
  };


  const handleStop= () => {
    dispatch(stopInference(inference.id));
  };

  const handleNewLoglikelihood = () => 
    logLikelihoodsAppend({
      form: "N",
      variable: "",
      priors: [],
      parameters: [],
      biomarker_type: "",
    });

  const max_number_of_iterations = watch(
    "max_number_of_iterations", 
    inference.max_number_of_iterations
  )
  

  const onSubmit = (values) => {
    values.log_likelihoods = values.log_likelihoods.map(ll =>
      Object.keys(ll).reduce((sum, key) => {
        let value = ll[key]
        if (value === '') {
          value = null
        }
        sum[key] = value
        return sum
      }, {})
    )
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

  const initialization_options = [
    { key: "NA", value: "" },
    { key: "Random from prior", value: "R" },
    { key: "Default values of model", value: "D" },
    { key: "From another inference", value: "F" },
  ]

  
  
  return (
    <div>
    <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
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


      <Typography>Statistical model</Typography>
      <div className={classes.graph}>
      {nodes && <ReactFlow 
        nodes={nodes} 
        edges={edges} 
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
      />}
      </div>

      <FormSelectField
        control={control}
        disabled={readOnly}
        defaultValue={inference.algorithm || ""}
        useGroups
        options={algorithm_options}
        name="algorithm"
        label="Algorithm"
      />

      <FormSelectField
        control={control}
        options={initialization_options}
        defaultValue={inference.initialization_strategy || ""}
        name="initialization_strategy"
        disabled={readOnly}
        label="Initialization Strategy"
      />

      <FormSelectField
        control={control}
        options={inference_options}
        defaultValue={inference.initialization_inference || ""}
        displayEmpty
        name="initialization_inference"
        disabled={readOnly}
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
        label="Maximum iterations"
        disabled={readOnly}
        type="number"
      />
      </Grid>
      </Grid>

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
          disabled={false}
          variant="contained"
        >
          Save
        </Button>
        <Button
          className={classes.controls}
          onClick={handleEdit}
          variant="contained"
        >
          Edit
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
    <InferenceDialog 
      open={openDialog}
      handleCloseDialog={handleCloseDialog}
      project={project}
      defaultValues={inference.metadata}
    />
    </div>
  );
}
