import React from "react";
import { makeStyles } from '@material-ui/core/styles';
import {
  Link, matchPath, useLocation
} from "react-router-dom";

import { useSelector } from 'react-redux'
import AccountTreeIcon from '@material-ui/icons/AccountTree';

import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';

import Divider from '@material-ui/core/Divider';

import Collapse from '@material-ui/core/Collapse';
import ExpandLess from '@material-ui/icons/ExpandLess';
import ExpandMore from '@material-ui/icons/ExpandMore';

import ListIcon from '@material-ui/icons/List';

import VisibilityIcon from '@material-ui/icons/Visibility';
import TimelineIcon from '@material-ui/icons/Timeline';
import CheckBoxOutlineBlankIcon from '@material-ui/icons/CheckBoxOutlineBlank';
import BubbleChartIcon from '@material-ui/icons/BubbleChart';
import SettingsBackupRestoreIcon from '@material-ui/icons/SettingsBackupRestore';

import Datasets from '../datasets/Datasets' 
import PkModels from '../pkModels/PkModels' 
import PdModels from '../pdModels/PdModels' 
import Protocols from '../protocols/Protocols' 

import {
  selectChosenProject, userHasReadOnlyAccess
} from '../projects/projectsSlice.js'



const useStyles = makeStyles((theme) => ({
  nested: {
    paddingLeft: theme.spacing(4),
  },
}));


export default function ProjectMenu() {
  const classes = useStyles();
  const [dataAnalysisOpen, setDataAnalysisOpen] = React.useState(false);
  const handleDataAnalysisClick = () => {
    setDataAnalysisOpen((open) => !open);
  };
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
        <Datasets project={project} disableSave={disableSave}/>
        <PdModels project={project} disableSave={disableSave}/>
        <PkModels project={project} disableSave={disableSave}/>
        <Protocols project={project} disableSave={disableSave}/>
      </React.Fragment>
      }

    </List>
  )
}
