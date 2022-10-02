import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
import Button from "@material-ui/core/Button";
import Alert from "@material-ui/lab/Alert";
import Box from "@material-ui/core/Box";
import Grid from "@material-ui/core/Grid";
import { useForm } from "react-hook-form";
import { makeStyles } from "@material-ui/core/styles";
import Toolbar from "@material-ui/core/Toolbar";
import List from "@material-ui/core/List";
import Typography from "@material-ui/core/Typography";
import ListItem from "@material-ui/core/ListItem";
import Paper from "@material-ui/core/Paper";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";

import Header from "../modelling/Header";
import Footer from "../modelling/Footer";
import ComponentForm from "../forms/ComponentForm";
import {
  updatePdModel,
  uploadPdSbml,
  deletePdModel,
} from "../pdModels/pdModelsSlice";
import { FormTextField } from "../forms/FormComponents";
import { userHasReadOnlyAccess } from "../projects/projectsSlice";

const useStyles = makeStyles((theme) => ({
  topToolbar: {
    backgroundColor: theme.palette.primary.light,
    position: 'sticky',
    top: 0,
  },
  toolbar: {
    backgroundColor: theme.palette.primary.light,
    position: 'sticky',
    bottom: 0,
  },
  controls: {
    justifyContent: 'center',
    "& > *": {
      margin: theme.spacing(1),
    },
  },
  root: {
    width: "100%",
    padding: theme.spacing(2),
    maxHeight: '75vh', overflow: 'auto'
  },
  paper: {
    padding: theme.spacing(2)
  },
  heading: {
    fontWeight: 'bold'
  },
  components: {
    width: "100%",
  },
}));

export default function PdDetail({ project, pd_model }) {
  const classes = useStyles();
  const { control, handleSubmit, reset } = useForm();
  const dispatch = useDispatch();

  const handlePdDelete = () => {
    dispatch(deletePdModel(pd_model.id));
  };

  const handleFileUpload = (event) => {
    console.log('handleFileUpload', event)
    const files = Array.from(event.target.files);
    const [file] = files;
    let reader = new FileReader();

    reader.onload = function () {
      dispatch(uploadPdSbml({ id: pd_model.id, sbml: reader.result }));
    };

    reader.onerror = function () {
      console.log(reader.error);
    };

    reader.readAsText(file);
  };

  useEffect(() => {
    reset(pd_model);
  }, [reset, pd_model]);

  const onSubmit = (values) => {
    dispatch(updatePdModel(values));
  };

  const disableSave = userHasReadOnlyAccess(project);

  return (
    <Paper>
    <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
      <Header title={`PD Model: ${pd_model.name}`} />
      <Box className={classes.root}>
      <Grid container spacing={1}>
      <Grid item xs={12}>
      <FormTextField
        control={control}
        defaultValue={pd_model.name}
        name="name"
        label="Name"
      />
      </Grid>

      <Grid item xs={12}>
      <Typography>Components</Typography>
      </Grid>
      {pd_model.components.map((component, index) => {
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

      <Grid item xs={12}>
      <FormTextField
        control={control}
        defaultValue={pd_model.time_max}
        name="time_max"
        label="Maximum Time"
        type="number"
      />
      </Grid>
      </Grid>

      {pd_model.errors &&
        pd_model.errors.map((error, index) => (
          <Alert key={index} severity="error">
            {error}
          </Alert>
        ))}
      </Box>

      <Footer
        buttons={[
          {label: 'Save', handle: handleSubmit(onSubmit)},
          {label: 'Delete', handle: handlePdDelete},
          {label: 'Upload SBML file', handle: handleFileUpload, variant: 'fileUpload'},
        ]}
      />
    </form>
    </Paper>
  );
}
