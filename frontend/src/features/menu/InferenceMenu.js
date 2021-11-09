import React from "react";

import { useSelector } from 'react-redux'
import AccountTreeIcon from '@material-ui/icons/AccountTree';

import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';

import Divider from '@material-ui/core/Divider';

import Inferences from '../datasets/Inferences' 

import {
  selectChosenProject, userHasReadOnlyAccess
} from '../projects/projectsSlice.js'


export default function ProjectMenu() {
  const project = useSelector(selectChosenProject);
  console.log('got project', project)

  const disableSave = project ? userHasReadOnlyAccess(project) : true

  const projectName = project ? project.name : "None";

  return (
    <List>
        <ListItem button >
          <ListItemIcon>
            <AccountTreeIcon/>
          </ListItemIcon>
          <ListItemText primary={"Project: " + projectName} />
        </ListItem>
      {project &&
      <React.Fragment>
        <Divider />
        <Inferences project={project} disableSave={disableSave}/>
      </React.Fragment>
      }

    </List>
  )
}
