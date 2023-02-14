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
import Button from "@material-ui/core/Button";
import Box from "@material-ui/core/Box";
import Paper from "@material-ui/core/Paper";
import { useForm } from "react-hook-form";
import { makeStyles } from "@material-ui/core/styles";
import List from "@material-ui/core/List";
import CircularProgress from "@material-ui/core/CircularProgress";
import ListItem from "@material-ui/core/ListItem";

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

const useStyles = makeStyles((theme) => ({
  table: {
    width: "100%",
  },
  tableCell: {
    width: "100pt",
  },
  controlsRoot: {
    display: "flex",
    alignItems: "center",
  },
  controls: {
    margin: theme.spacing(1),
  },
}));

export default function ProjectDetail({ project }) {
  const classes = useStyles();
  const users = useSelector(selectAllUsers);
  const userEntities = useSelector((state) => state.users.entities);
  const dispatch = useDispatch();
  const { control, handleSubmit, reset } = useForm();
  const disableSave = useSelector(state => userHasReadOnlyAccess(state, project));
  const user_options = users.map((user) => ({
    key: user.username,
    value: user.id,
  }));

  useEffect(() => {
    reset(project);
  }, [reset, project]);

  const handleDeleteProject = () => {
    console.log('delete project', project)
    dispatch(deleteProject(project.id));
  };

  const onSubmit = (values) => {
    const users_in_project = values.user_access.map((ua) => ua.user);
    const users_to_be_added = values.users.filter(u => !users_in_project.includes(u));
    const users_to_be_removed = values.user_access.filter(u => !values.users.includes(u.user)).map(u => u.user);
    let new_user_access = values.user_access.filter((ua) => !users_to_be_removed.includes(ua.user));
    new_user_access.push(...users_to_be_added.map(u => ({user: u, read_only: true, project: project.id})));
    values.user_access = new_user_access;
    console.log("project detail submit", values);
    dispatch(updateProject(values));
  };
  return (
    <Paper>
    <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
      <Header title={`Project: ${project.name}`} />
      <Box className={classes.root}>
      <FormTextField
        control={control}
        defaultValue={project.name}
        name="name"
        label="Name"
      />
      {user_options.length > 0 && (
        <FormMultiSelectField
          control={control}
          defaultValue={project.users}
          options={user_options}
          name="users"
          label="Users"
        />
      )}
      <List dense>
        {project.user_access.map((ua, i) => {
          const user = userEntities[ua.user];
          if (!user) {
            return null;
          }
          const read_only = ua.read_only;
          return (
            <ListItem key={user.username}>
              <FormCheckboxField
                control={control}
                defaultValue={read_only}
                name={`user_access[${i}].read_only`}
                label={`${user.username} is read-only`}
              />
            </ListItem>
          );
        })}
      </List>
      <FormTextField
        control={control}
        className={classes.description}
        fullWidth
        multiline
        name="description"
        label="Description"
      />
      </Box>
      <Footer
        buttons={[
          {label: 'Save', handle: handleSubmit(onSubmit)},
          {label: 'Delete', handle: handleDeleteProject},
        ]}
      />
    </form>
    </Paper>
  )
}


