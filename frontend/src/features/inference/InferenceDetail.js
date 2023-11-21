import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import Divider from '@mui/material/Divider';
import Button from "@mui/material/Button";

import { useHistory } from "react-router-dom";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";

import FormControl from "@mui/material/FormControl";
import ReactFlow, { MarkerType, applyEdgeChanges, applyNodeChanges } from 'react-flow-renderer';
import Stack from "@mui/material/Stack";
import * as ELK from 'elkjs';
import InputLabel from "@mui/material/InputLabel";
import Alert from '@mui/material/Alert';
import { useForm, useFieldArray } from "react-hook-form";
import makeStyles from '@mui/styles/makeStyles';
import Typography from "@mui/material/Typography";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Tooltip from "@mui/material/Tooltip";
import Select from "@mui/material/Select";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";


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

export default function InferenceDetail({ project, inference }) {
  const dispatch = useDispatch();
  let history = useHistory();
  const [openDialog, setOpenDialog] = React.useState(false);
  const handleCloseDialog = () => {
    setOpenDialog(false);
  };
  const handleEdit = () => {
    setOpenDialog(true);
  };

  let logLikelihoodNodes = inference.log_likelihoods.map(ll => {
    let label = (<>{ll.name}</>)
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
    history.push(`/${project.id}/inference`);
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

  const readOnly = useSelector(state => userHasReadOnlyAccess(state, project)) || inference.read_only;

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
      <Grid container spacing={1}>
      <Grid item xs={12}>
      <FormTextField
        control={control}
        name="name"
        label="Name"
      />
      </Grid>

      <Grid item xs={12}>
      <FormTextField
        control={control}
        fullWidth
        multiline
        name="description"
        label="Description"
      />
      </Grid>


      <Grid item xs={12}>
      <Typography>Statistical model</Typography>
      <div sx={{height: "30vh", width: "100%"}}>
      {nodes && <ReactFlow 
        nodes={nodes} 
        edges={edges} 
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
      />}
      </div>
      </Grid>

      <Grid item xs={3}>
      <FormSelectField
        fullWidth
        control={control}
        disabled={readOnly}
        defaultValue={inference.algorithm || ""}
        useGroups
        options={algorithm_options}
        name="algorithm"
        label="Algorithm"
      />
      </Grid>

      <Grid item xs={3}>
      <FormSelectField
        fullWidth
        control={control}
        options={initialization_options}
        defaultValue={inference.initialization_strategy || ""}
        name="initialization_strategy"
        disabled={readOnly}
        label="Initialization Strategy"
      />
      </Grid>

      <Grid item xs={3}>
      <FormSelectField
        fullWidth
        control={control}
        options={inference_options}
        defaultValue={inference.initialization_inference || ""}
        displayEmpty
        name="initialization_inference"
        disabled={readOnly}
        label="Initialize from"
      />
      </Grid>

      <Grid item xs={3}>
      <FormTextField
        fullWidth
        control={control}
        disabled={readOnly}
        name="number_of_chains"
        label="Number of chains"
        type="number"
      />
      </Grid>



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



      <Grid item xs={12}> 
        <Stack direction="row" spacing={1}> 
        <Button
          type="submit"
          disabled={false}
          variant="contained"
        >
          Save
        </Button>
        <Button
          onClick={handleEdit}
          variant="contained"
        >
          Edit
        </Button>
        <Button
          disabled={readOnly}
          onClick={handleStop}
          variant="contained"
        >
          Stop
        </Button>
        <Button
          variant="contained"
          onClick={handleDelete}
          disabled={false}
        >
          Delete
        </Button>
        </Stack>
      </Grid>
      </Grid>
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
