import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
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


export default function InferenceListDialog({ project, onClose, model_type, model, open }) {
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
