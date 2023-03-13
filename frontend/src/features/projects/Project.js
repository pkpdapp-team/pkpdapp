import React, { useEffect } from "react";
import {
  Switch,
  Route,
  useParams,
  Link,
  matchPath,
  useRouteMatch,
  Redirect,
  useLocation,
  useHistory,
} from "react-router-dom";

import { useSelector, useDispatch } from "react-redux";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import { useForm } from "react-hook-form";
import makeStyles from '@mui/styles/makeStyles';
import List from "@mui/material/List";
import CircularProgress from "@mui/material/CircularProgress";
import ListItem from "@mui/material/ListItem";

import Inferences from "../inference/Inferences";
import Inference from "../inference/Inference";
import Modelling from "../modelling/Modelling";
import Header from "../modelling/Header";
import Footer from "../modelling/Footer";

import {
  FormTextField,
  FormMultiSelectField,
  FormCheckboxField,
} from "../forms/FormComponents";
import { selectAllUsers } from "../projects/usersSlice.js";

import {
  selectProjectById,
  updateProject,
  chooseProject,
  deleteProject,
  userHasReadOnlyAccess,
} from "../projects/projectsSlice.js";

import { fetchDatasets } from "../datasets/datasetsSlice.js";

import { fetchUnits} from "../projects/unitsSlice.js";

import { fetchPkModels } from "../pkModels/pkModelsSlice.js";

import { fetchPdModels } from "../pdModels/pdModelsSlice.js";

import { fetchBasePkModels } from "../pkModels/basePkModelsSlice.js";

import { fetchProtocols } from "../protocols/protocolsSlice.js";

import { fetchVariables } from "../variables/variablesSlice.js";

import { fetchInferences } from "../inference/inferenceSlice.js";

import { fetchChains } from "../inference/chainSlice.js";
import { clearSelectItem } from "../modelling/modellingSlice";

const useStyles = makeStyles((theme) => ({
}));


export default function Project() {
  let { id } = useParams();
  let { path, url } = useRouteMatch();
  const project = useSelector((state) => selectProjectById(state, id));
  const classes = useStyles();
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchDatasets(id));
    dispatch(fetchPkModels(id));
    dispatch(fetchPdModels(id));
    dispatch(fetchBasePkModels(id));
    dispatch(fetchVariables(id));
    dispatch(fetchProtocols(id));
    dispatch(fetchUnits(id));
    dispatch(fetchInferences(id));
    dispatch(clearSelectItem());
  }, [id]);

  if (!project) {
    return (<CircularProgress />)
  }

  return (
    <Switch>
      <Route exact path={path}>
       <Modelling project={project}/>
      </Route>
      <Route path={`${path}/inference/:id`}>
        <Inference project={project} />
      </Route>
      <Route path={`${path}/inference`}>
        <Inferences project={project}/>
      </Route>
    </Switch>
  );
}
