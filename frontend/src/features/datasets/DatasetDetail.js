import React, { useEffect, useSelector } from "react";
import { useDispatch } from "react-redux";
import Button from "@material-ui/core/Button";
import Grid from "@material-ui/core/Grid";
import Box from "@material-ui/core/Box";
import Alert from "@material-ui/lab/Alert";
import { useForm } from "react-hook-form";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogActions from "@material-ui/core/DialogActions";
import Tab from "@material-ui/core/Tab";
import Tabs from "@material-ui/core/Tabs";

import Accordion from "@material-ui/core/Accordion";
import AccordionSummary from "@material-ui/core/AccordionSummary";
import Paper from "@material-ui/core/Paper";
import AccordionDetails from "@material-ui/core/AccordionDetails";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";

import Header from "../modelling/Header";
import Footer from "../modelling/Footer";
import SubjectsTable from "./SubjectsTable";
import BiomarkerTypeSubform from "./BiomarkerTypeSubform";

import AuceDetail from "../dataAnalysis/AuceDetail"
import NcaDetail from "../dataAnalysis/NcaDetail"

import { userHasReadOnlyAccess } from "../projects/projectsSlice";

import {
  updateDataset,
  uploadDatasetCsv,
  deleteDataset,
} from "../datasets/datasetsSlice";
import { FormTextField, FormDateTimeField } from "../forms/FormComponents";

const useStyles = makeStyles((theme) => ({
  root: {
    width: "100%",
    padding: theme.spacing(2),
    maxHeight: '75vh', overflow: 'auto'
  },
  rootTab: {
    width: "100%",
    padding: theme.spacing(2),
    height: '75vh', overflow: 'auto'
  },
  paper: {
    padding: theme.spacing(2)
  },
  tabs: {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    borderBottom: 1,
    borderColor: 'divider',
  },
  dialogFooter: {
  }
}));

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

function DataAnalysisDialog({ project, onClose, dataset, open }) {
  const classes = useStyles();
  const [value, setValue] = React.useState(0);
  const handleClose = () => {
    onClose();
  };

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Dialog  onClose={handleClose} open={open} maxWidth='lg' fullWidth>
      <div className={classes.tabs}>
        <Tabs value={value} onChange={handleChange} aria-label="basic tabs example">
          <Tab label="NCA" {...a11yProps(0)} />
          <Tab label="AUCA" {...a11yProps(1)} />
        </Tabs>
      </div>
      <TabPanel className={classes.rootTab} value={value} index={0}>
        <NcaDetail project={project} dataset={dataset} />
      </TabPanel>
      <TabPanel className={classes.rootTab} value={value} index={1}>
        <AuceDetail project={project} dataset={dataset} />
      </TabPanel>
      <DialogActions className={classes.dialogFooter}>
        <Button onClick={handleClose} autoFocus>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}


export default function DatasetDetail({ project, dataset }) {
  const classes = useStyles();
  const { control, handleSubmit, reset } = useForm();
  const dispatch = useDispatch();

  const [openDataAnalysis, setOpenDataAnalysis] = React.useState(false);
  const handleDataAnalysis = () => {
    setOpenDataAnalysis(true);
  };
  const handleCloseDataAnalysis = () => {
    setOpenDataAnalysis(false);
  };

  useEffect(() => {
    reset(dataset);
  }, [reset, dataset]);


  const handleDatasetDelete = () => {
    dispatch(deleteDataset(dataset.id));
  };

  const handleFileUpload = (event) => {
    console.log(event)
    const files = Array.from(event.target.files);
    const [file] = files;
    dispatch(uploadDatasetCsv({ id: dataset.id, csv: file }));
  };

  const onSubmit = (values) => {
    dispatch(updateDataset(values));
  };

  const disableSave = userHasReadOnlyAccess(project);

  return (
    <Paper>
    <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
      <Header title={`Dataset: ${dataset.name}`} />
      <Box className={classes.root}>
      <FormTextField
        control={control}
        defaultValue={dataset.name}
        name="name"
        label="Name"
      />
      <FormDateTimeField
        control={control}
        defaultValue={dataset.datetime}
        name="datetime"
        label="DateTime"
      />

      <Grid container item xs={12} spacing={3}>
        <Grid item xs={12}>
          <Typography>Variables</Typography>
          <List>
            {dataset.biomarker_types.map((biomarker_id, index) => {
              return (
                <ListItem key={index} role={undefined} dense>
                  <BiomarkerTypeSubform
                    biomarker_id={biomarker_id}
                    disableSave={disableSave}
                  />
                </ListItem>
              );
            })}
          </List>
        </Grid>
        <Grid item xs={12}>
          <SubjectsTable dataset={dataset} disableSave={disableSave}/>
        </Grid>
      </Grid>

      {dataset.errors &&
        dataset.errors.map((error, index) => (
          <Alert key={index} severity="error">
            {error}
          </Alert>
        ))}
      </Box>
      <Footer
        buttons={[
          {label: 'Save', handle: handleSubmit(onSubmit)},
          {label: 'Delete', handle: handleDatasetDelete},
          {label: 'Upload CSV file', handle: handleFileUpload, variant: 'fileUpload'},
          {label: 'Analysis', handle: handleDataAnalysis},
        ]}
      />

      <DataAnalysisDialog
        project={project}
        open={openDataAnalysis}
        onClose={handleCloseDataAnalysis}
        dataset={dataset}
      />
    </form>
    </Paper>
  );
}
