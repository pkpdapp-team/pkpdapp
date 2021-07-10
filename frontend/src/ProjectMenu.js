import React, { useEffect, useState } from "react";
import { makeStyles } from '@material-ui/core/styles';
import {
  Link,
} from "react-router-dom";
import { useSelector } from 'react-redux'

import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';

import Divider from '@material-ui/core/Divider';
import Tooltip from '@material-ui/core/Tooltip';

import Collapse from '@material-ui/core/Collapse';
import ExpandLess from '@material-ui/icons/ExpandLess';
import ExpandMore from '@material-ui/icons/ExpandMore';

import Avatar from '@material-ui/core/Avatar';
import ListItemAvatar from '@material-ui/core/ListItemAvatar';

import AvatarListItem from './AvatarListItem'


import VisibilityIcon from '@material-ui/icons/Visibility';
import TimelineIcon from '@material-ui/icons/Timeline';
import CheckBoxOutlineBlankIcon from '@material-ui/icons/CheckBoxOutlineBlank';
import BubbleChartIcon from '@material-ui/icons/BubbleChart';
import SettingsBackupRestoreIcon from '@material-ui/icons/SettingsBackupRestore';
import BatteryUnknownIcon from '@material-ui/icons/BatteryUnknown';
import BackupIcon from '@material-ui/icons/Backup';
import DateRangeIcon from '@material-ui/icons/DateRange';
import AllInboxIcon from '@material-ui/icons/AllInbox';

import Datasets from './Datasets' 
import PkModels from './PkModels' 
import PdModels from './PdModels' 

import {
  selectChosenProject, 
} from './features/projects/projectsSlice.js'



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

  return (
    <List>
      <ListItem button component={Link} to="/">
        <ListItemIcon>
          <VisibilityIcon />
        </ListItemIcon>
        <ListItemText primary='Modelling' />
      </ListItem>
      <ListItem button onClick={handleDataAnalysisClick}>
        <ListItemIcon>
          <TimelineIcon/>
        </ListItemIcon>
        <ListItemText primary='Data Analysis' />
        {dataAnalysisOpen ? <ExpandLess /> : <ExpandMore />}
      </ListItem>
      <Collapse in={dataAnalysisOpen} timeout="auto" unmountOnExit>
      <List component="div" disablePadding>
       <ListItem button className={classes.nested}>
        <ListItemIcon>
          <CheckBoxOutlineBlankIcon />
        </ListItemIcon>
        <ListItemText primary='NCA' />
       </ListItem>
        <ListItem button className={classes.nested}>
        <ListItemIcon>
          <BubbleChartIcon />
        </ListItemIcon>
        <ListItemText primary='AUCE' />
       </ListItem>
      </List>
      </Collapse>
      <ListItem button >
        <ListItemIcon>
          <SettingsBackupRestoreIcon/>
        </ListItemIcon>
        <ListItemText primary='Inference' />
      </ListItem>

      <Divider />

      <Datasets project={project}/>

      <PkModels project={project}/>

      <PdModels project={project}/>
    </List>
  )
}
