import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import { useForm } from "react-hook-form";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";

import Header from "../modelling/Header";
import Footer from "../modelling/Footer";
import ImportMonolixDialog from "./ImportMonolixDialog";

import {
  FormTextField,
  FormMultiSelectField,
  FormCheckboxField,
} from "../forms/FormComponents";
import { selectAllUsers } from "../projects/usersSlice.js";

import {
  updateProject,
  deleteProject,
  userHasReadOnlyAccess,
} from "../projects/projectsSlice.js";


export default function ProjectDetail({ project }) {
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

  const [openMonolixDialog, setOpenMonolixDialog] = useState(false);

  const handleCloseMonolixDialog = (arg) => {
    setOpenMonolixDialog(false)
  }

  const handleImportMonolix = () => {
    setOpenMonolixDialog(true)
  }

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
      <Stack spacing={1} sx={{p: 1}}>
        <FormTextField
          fullWidth
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
          multiline
          fullWidth
          name="description"
          label="Description"
        />
      </Stack>
      <Footer
        buttons={[
          {label: 'Save', handle: handleSubmit(onSubmit)},
          {label: 'Delete', handle: handleDeleteProject},
          {label: 'Import Monolix Project', handle: handleImportMonolix},
        ]}
      />
    </form>
    <ImportMonolixDialog
        project={project}
        onClose={handleCloseMonolixDialog}
        open={openMonolixDialog}
    />
    </Paper>
  )
}


