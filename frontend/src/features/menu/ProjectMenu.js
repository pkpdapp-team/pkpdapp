import React from "react";
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
  selectChosenProject, 
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

  return (
    <List>
      <ListItem button component={Link} to="/">
        <ListItemIcon>
          <ListIcon />
        </ListItemIcon>
        <ListItemText primary='Projects' />
      </ListItem>
      <ListItem button component={Link} to="/modelling">
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
      <PdModels project={project}/>
      <PkModels project={project}/>
      <Protocols project={project}/>

    </List>
  )
}
