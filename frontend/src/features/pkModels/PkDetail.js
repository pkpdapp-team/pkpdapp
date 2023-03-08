import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Grid from "@mui/material/Grid";
import ListItem from "@mui/material/ListItem";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Paper from "@mui/material/Paper";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import AppBar from "@mui/material/AppBar";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Toolbar from "@mui/material/Toolbar";
import DeleteIcon from "@mui/icons-material/Delete";

import { useForm, useFieldArray } from "react-hook-form";
import makeStyles from '@mui/styles/makeStyles';
import Typography from "@mui/material/Typography";


import InferenceListDialog from "../inference/InferenceListDialog";
import ComponentForm from "../forms/ComponentForm";
import Header from "../modelling/Header";
import Footer from "../modelling/Footer";
import { FormTextField, FormSelectField } from "../forms/FormComponents";

import { selectAllBasePkModels } from "../pkModels/basePkModelsSlice.js";

import { selectAllDatasets } from "../datasets/datasetsSlice.js";

import { selectAllProtocols } from "../protocols/protocolsSlice.js";

import { updatePkModel, deletePkModel, setPkVariablesByInference } from "../pkModels/pkModelsSlice.js";

import { selectAllPdModels } from "../pdModels/pdModelsSlice.js";

import { userHasReadOnlyAccess } from "../projects/projectsSlice";

import { 
  selectVariablesByDosedPkModel,
} from "../variables/variablesSlice.js";


export default function PkDetail({ project, pk_model }) {
  const mappings_no_null = pk_model.mappings.map(m =>
    Object.keys(m).reduce((sum, key) => {
      sum[key] = m[key] || ""
      return sum
    }, {}))

  const pk_model_no_null = Object.keys(pk_model).reduce((sum, key) => {
    if (key === 'mappings') {
      sum[key] = mappings_no_null
    } else if (key === 'datetime') {
      sum[key] = pk_model[key]
    } else if (pk_model[key] === null) {
      sum[key] = ""
    } else {
      sum[key] = pk_model[key]
    }
    return sum
  }, {})
  console.log('pk_model_no_null', pk_model_no_null)
  const { control, handleSubmit, reset } = useForm({
    defaultValues: pk_model_no_null,
  });
  const dispatch = useDispatch();

  const {
    fields: mappings,
    append: mappingsAppend,
    remove: mappingsRemove,
  } = useFieldArray({
    control,
    name: `mappings`,
  });

  const handleNewMapping = () => mappingsAppend(
    { pkpd_model: pk_model.id, pk_variable: '', pd_variable: '' } 
  )

  const basePkModels = useSelector(selectAllBasePkModels);
  const protocols = useSelector(selectAllProtocols);
  const datasets = useSelector(selectAllDatasets);
  const pdModels = useSelector(selectAllPdModels);
  const pd_model_options = pdModels.map((pd_model) => ({
    key: pd_model.name,
    value: pd_model.id,
  })).concat([{key: 'None', value: ''}]);

  const variables = useSelector((state) => {
    return selectVariablesByDosedPkModel(state, pk_model.id);
  });
  const variablesOptions = variables?.map(v => ({
    key: v.qname, value: v.id
  }))

  useEffect(() => {
    reset(pk_model_no_null);
  }, [reset, pk_model]);

  const handlePkDelete = () => {
    dispatch(deletePkModel(pk_model.id));
  };


  const [openInferenceDialog, setOpenInferenceDialog] = useState(false);

  const handleCloseInferenceDialog = (inference) => {
    if (inference) {
      dispatch(setPkVariablesByInference({id: pk_model.id, inference_id: inference.id}));
    }
    setOpenInferenceDialog(false)
  }

  const handleSetVariablesFromInference = () => {
    setOpenInferenceDialog(true);
  };

  const onSubmit = (values) => {
    console.log('submit', values)
    dispatch(updatePkModel(values));
  };

  const base_pk_model_options = basePkModels.filter(pk => !pk.read_only).map((pk) => ({
    key: pk.name,
    value: pk.id,
  }));

  let protocol_options = [];
  protocol_options = protocol_options.concat(
    protocols.map((protocol) => ({ key: protocol.name, value: protocol.id }))
  );
  console.log('pk_model', pk_model)
  for (let i = 0; i < datasets.length; i++) {
    const dataset_protocols = datasets[i].protocols.map((protocol) => ({
      key: protocol.name,
      value: protocol.id,
    }));
    protocol_options = protocol_options.concat(dataset_protocols);
  }

  const dose_compartment_options = pk_model.components.map(c => (
    { key: c.name, value: c.name }
  ));

  const disableSave = useSelector(state => userHasReadOnlyAccess(state, project));

  return (
    <Paper sx={{maxHeight: '85vh', overflow: 'auto'}}>
    <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
      <Header title={`PK Model: ${pk_model.name}`}/>
      <Grid container spacing={1} sx={{p: 1}}>
      <Grid item xs={12}>
      <FormTextField
        fullWidth
        control={control}
        name="name"
        label="Name"
      />
      </Grid>

      <Grid item xs={6}>
      <FormSelectField
        fullWidth
        control={control}
        options={base_pk_model_options}
        name="pk_model"
        label="Base Pharmacokinetic Model"
      />
      </Grid>
      <Grid item xs={6}>
      <FormSelectField
        fullWidth
        control={control}
        control={control}
        options={pd_model_options}
        name="pd_model"
        label="Pharmacodynamic Model"
        displayEmpty
      />
      </Grid>

      <Grid item xs={12}>
      <Typography>Mapping variables</Typography>
      </Grid>
      {mappings.map((mapping, i) => {
        return (
          <React.Fragment key={i}>
          <Grid item xs={1}>
          </Grid>
          <Grid item xs={5}>
          <FormSelectField
            fullWidth
            control={control}
            options={variablesOptions}
            name={`mappings[${i}].pk_variable`}
            label="Pharmacokinetic Variable"
          />
          </Grid>
          <Grid item xs={5}>
          <FormSelectField
            fullWidth
            control={control}
            options={variablesOptions}
            name={`mappings[${i}].pd_variable`}
            label="Pharmacodynamic Variable"
          />
          </Grid>
          <Grid item xs={1}>
          <IconButton size="small" onClick={() => mappingsRemove(i)}>
            <DeleteIcon />
          </IconButton>
          </Grid>
          </React.Fragment>
        )
      })}
      <Grid item xs={12}>
      <IconButton size="small" onClick={handleNewMapping}>
        <AddIcon />
      </IconButton>
      </Grid>

      <Grid item xs={6}>
      <FormSelectField
        fullWidth
        control={control}
        options={dose_compartment_options}
        name="dose_compartment"
        label="Dose Compartment"
      />
      </Grid>
      <Grid item xs={6}>
      <FormSelectField
        fullWidth
        control={control}
        options={protocol_options}
        name="protocol"
        label="Protocol"
      />
      </Grid>
      <Grid item xs={6}>
      <FormTextField
        fullWidth
        control={control}
        name="time_max"
        label="Maximum Time"
        type="number"
      />
      </Grid>

      <Grid item xs={12}>
      <Typography>Components</Typography>
      </Grid>
      {pk_model.components.map((component, index) => {
        return (
          <Grid item xs={12}>
          <Paper key={index} variant={'outlined'} sx={{p: 1}}>
            <Typography variant='h5' gutterBottom component="div">
                    {component.name === "myokit" ? "root" : component.name}
            </Typography>
            <ComponentForm
              control={control}
              component={component}
              disableSave={disableSave}
            />
          </Paper>
          </Grid>
        );
      })}

      <Grid item xs={12}>
      <FormTextField
        control={control}
        name="mmt"
        label="Source (mmt format)"
        disabled
        multiline
      />
      </Grid>

      </Grid>
      <Footer
        buttons={[
          {label: 'Save', handle: handleSubmit(onSubmit)},
          {label: 'Delete', handle: handlePkDelete},
          {label: 'Set inferred parameters', handle: handleSetVariablesFromInference},
        ]}
      />
    </form>
      <InferenceListDialog 
        project={project}
        onClose={handleCloseInferenceDialog}
        model_type={'PK'}
        model={pk_model} 
        open={openInferenceDialog}
      />
    </Paper>
  );
}
