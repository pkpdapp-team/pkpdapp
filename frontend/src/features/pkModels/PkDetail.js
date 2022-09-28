import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import Button from "@material-ui/core/Button";
import List from "@material-ui/core/List";
import Box from "@material-ui/core/Box";
import IconButton from "@material-ui/core/IconButton";
import Grid from "@material-ui/core/Grid";
import ListItem from "@material-ui/core/ListItem";
import Accordion from "@material-ui/core/Accordion";
import AccordionSummary from "@material-ui/core/AccordionSummary";
import AccordionDetails from "@material-ui/core/AccordionDetails";
import Paper from "@material-ui/core/Paper";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import AddIcon from "@material-ui/icons/Add";
import AppBar from "@material-ui/core/AppBar";
import BottomNavigation from "@material-ui/core/BottomNavigation";
import BottomNavigationAction from "@material-ui/core/BottomNavigationAction";
import Toolbar from "@material-ui/core/Toolbar";
import DeleteIcon from "@material-ui/icons/Delete";

import { useForm, useFieldArray } from "react-hook-form";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";

import ComponentForm from "../forms/ComponentForm";
import Header from "../modelling/Header";
import Footer from "../modelling/Footer";
import { FormTextField, FormSelectField } from "../forms/FormComponents";

import { selectAllBasePkModels } from "../pkModels/basePkModelsSlice.js";

import { selectAllDatasets } from "../datasets/datasetsSlice.js";

import { selectAllProtocols } from "../protocols/protocolsSlice.js";

import { updatePkModel, deletePkModel } from "../pkModels/pkModelsSlice.js";

import { selectAllPdModels } from "../pdModels/pdModelsSlice.js";

import { userHasReadOnlyAccess } from "../projects/projectsSlice";

import { 
  selectVariablesByDosedPkModel,
} from "../variables/variablesSlice.js";



const useStyles = makeStyles((theme) => ({
  topToolbar: {
    backgroundColor: theme.palette.primary.main,
    position: 'sticky',
    top: 0,
  },
  header: {
    fontWeight:'bold',
    color: theme.palette.primary.contrastText,
  },
  root: {
    width: "100%",
    padding: theme.spacing(2),
  },
  paper: {
    padding: theme.spacing(2)
  },
  components: {
    width: "100%",
  },
  toolbar: {
    backgroundColor: theme.palette.primary.main,
    position: 'sticky',
    bottom: 0,
  },
  controls: {
    justifyContent: 'center',
    "& > *": {
      margin: theme.spacing(1),
    },
  },
}));

export default function PkDetail({ project, pk_model }) {
  const classes = useStyles();
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
  }));

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

  const dose_compartment_options = [
    { key: "central", value: "central" },
    { key: "peripheral1", value: "peripheral1" },
    { key: "peripheral2", value: "peripheral2" },
  ];

  const disableSave = userHasReadOnlyAccess(project);

  return (
    <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
      <Header title={`PK Model: ${pk_model.name}`}/>

      <Box className={classes.root}>
      <Grid container spacing={1}>
      <Grid item xs={12}>
      <FormTextField
        control={control}
        name="name"
        label="Name"
      />
      </Grid>

      <Grid item xs={6}>
      <FormSelectField
        control={control}
        options={base_pk_model_options}
        name="pk_model"
        label="Base Pharmacokinetic Model"
      />
      </Grid>
      <Grid item xs={6}>
      <FormSelectField
        control={control}
        options={pd_model_options}
        name="pd_model"
        label="Pharmacodynamic Model"
      />
      </Grid>

      <Grid item xs={12}>
      <Typography>Mapping variables</Typography>
      </Grid>
      {mappings.map((mapping, i) => {
        return (
          <React.Fragment key={i}>
          <Grid item xs={2}>
          </Grid>
          <Grid item xs={4}>
          <FormSelectField
            control={control}
            options={variablesOptions}
            name={`mappings[${i}].pk_variable`}
            label="Pharmacokinetic Variable"
          />
          </Grid>
          <Grid item xs={4}>
          <FormSelectField
            control={control}
            options={variablesOptions}
            name={`mappings[${i}].pd_variable`}
            label="Pharmacodynamic Variable"
          />
          </Grid>
          <Grid item xs={2}>
          <IconButton size="small" onClick={() => mappingsRemove(i)}>
            <DeleteIcon />
          </IconButton>
          </Grid>
          </React.Fragment>
        )
      })}
        <IconButton size="small" onClick={handleNewMapping}>
          <AddIcon />
         </IconButton>

      <Grid item xs={12}>
      <Typography>Components</Typography>
      </Grid>
      {pk_model.components.map((component, index) => {
        return (
          <Grid item xs={12}>
          <Paper key={index} variant={'outlined'} className={classes.paper}>
            <Typography className={classes.heading} variant='h5' gutterBottom component="div">
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

      <Grid item xs={6}>
      <FormSelectField
        control={control}
        options={dose_compartment_options}
        name="dose_compartment"
        label="Dose Compartment"
      />
      </Grid>
      <Grid item xs={6}>
      <FormSelectField
        control={control}
        options={protocol_options}
        name="protocol"
        label="Protocol"
      />
      </Grid>
      <Grid item xs={6}>
      <FormTextField
        control={control}
        name="time_max"
        label="Maximum Time"
        type="number"
      />
      </Grid>
      </Grid>
      </Box>

      <Footer
        buttons={[
          {label: 'Save', handle: handleSubmit(onSubmit)},
          {label: 'Delete', handle: handlePkDelete},
        ]}
      />
    </form>
  );
}
