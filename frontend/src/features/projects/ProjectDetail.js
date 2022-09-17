import React, { useEffect } from "react";
import {
  useParams
} from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import Button from "@material-ui/core/Button";
import Paper from "@material-ui/core/Paper";
import { useForm } from "react-hook-form";
import { makeStyles } from "@material-ui/core/styles";
import List from "@material-ui/core/List";
import CircularProgress from "@material-ui/core/CircularProgress";
import ListItem from "@material-ui/core/ListItem";

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

function ProjectForm(project) {
  const classes = useStyles();
  const users = useSelector(selectAllUsers);
  const userEntities = useSelector((state) => state.users.entities);
  const dispatch = useDispatch();
  const { control, handleSubmit, reset } = useForm();
  const disableSave = userHasReadOnlyAccess(project);
  const user_options = users.map((user) => ({
    key: user.username,
    value: user.id,
  }));

  useEffect(() => {
    reset(project);
  }, [reset, project]);

  const onSubmit = (values) => {
    console.log("project detail submit", values);
    dispatch(updateProject(values));
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
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
      <div className={classes.controlsRoot}>
        <Button
          type="submit"
          variant="contained"
          className={classes.controls}
          disabled={disableSave}
        >
          Save
        </Button>
        <Button
          variant="contained"
          className={classes.controls}
          onClick={handleDeleteProject}
          disabled={disableSave}
        >
          Delete
        </Button>

        <Button
          variant="contained"
          className={classes.controls}
          onClick={handleSelectProject}
        >
          Select Project
        </Button>
      </div>
    </form>
  )
}

export default function ProjectDetail() {
  let { id } = useParams();
  const project = useSelector(selectProjectById);
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
  }, [id]);

  const handleDeleteProject = () => {
    dispatch(deleteProject(project.id));
  };


  return (
    <Paper className={classes.paper}>
      { project 
        ? <ProjectForm project={project} />
        : <CircularProgress />
      }
    </Paper>
  );
}
