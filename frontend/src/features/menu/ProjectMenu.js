import React from "react";

import { useSelector } from "react-redux";
import AccountTreeIcon from "@material-ui/icons/AccountTree";

import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";

import Divider from "@material-ui/core/Divider";

import Datasets from "../datasets/Datasets";
import PkModels from "../pkModels/PkModels";
import PdModels from "../pdModels/PdModels";
import Protocols from "../protocols/Protocols";

import {
  selectChosenProject,
  userHasReadOnlyAccess,
} from "../projects/projectsSlice.js";

export default function ProjectMenu() {
  const project = useSelector(selectChosenProject);
  console.log("got project", project);

  const disableSave = project ? userHasReadOnlyAccess(project) : true;

  const projectName = project ? project.name : "None";

  return (
    <List>
      <ListItem button>
        <ListItemIcon>
          <AccountTreeIcon />
        </ListItemIcon>
        <ListItemText primary={"Project: " + projectName} />
      </ListItem>
      {project && (
        <React.Fragment>
          <Divider />
          <Datasets project={project} disableSave={disableSave} />
          <PdModels project={project} disableSave={disableSave} />
          <PkModels project={project} disableSave={disableSave} />
          <Protocols project={project} disableSave={disableSave} />
        </React.Fragment>
      )}
    </List>
  );
}
