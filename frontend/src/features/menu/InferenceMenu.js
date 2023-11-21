import React from "react";

import { useSelector } from "react-redux";
import AccountTreeIcon from "@mui/icons-material/AccountTree";

import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";

import Divider from "@mui/material/Divider";

import Inferences from "../inference/Inferences";
import DraftInferences from "../inference/DraftInferences";

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
          <Inferences project={project} disableSave={disableSave} />
        </React.Fragment>
      )}
    </List>
  );
}
