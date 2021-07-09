import React, { useEffect, useState } from "react";

import { makeStyles } from '@material-ui/core/styles';
import { useSelector, useDispatch } from 'react-redux'
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import AddIcon from '@material-ui/icons/Add';
import ListItemText from '@material-ui/core/ListItemText';

import Tooltip from '@material-ui/core/Tooltip';

import Collapse from '@material-ui/core/Collapse';
import ExpandLess from '@material-ui/icons/ExpandLess';
import ExpandMore from '@material-ui/icons/ExpandMore';

import ListItemAvatar from '@material-ui/core/ListItemAvatar';
import Avatar from '@material-ui/core/Avatar';

import AvatarListItem from './AvatarListItem'
import {
  selectAllProjects, selectChosenProject, 
  chooseProject, addNewProject, fetchProjects,
} from './features/projects/projectsSlice.js'


const useStyles = makeStyles((theme) => ({
  avatarPlus: {
    width: theme.spacing(5),
    height: theme.spacing(5),
    backgroundColor: theme.palette.primary.main,
  },
}));


export default function ListOfProjects() {
  const classes = useStyles();
  const projects = useSelector(selectAllProjects);
  const project = useSelector(selectChosenProject);
  const dispatch = useDispatch()

  useEffect(() => {
    dispatch(fetchProjects())
    //const interval = setInterval(() => {
    //  refreshHarvesters();
    //}, 5000);
    //return () => clearInterval(interval);
  }, []);

  return (
    <List>
      {projects.map((p) => (
        <AvatarListItem
          item={p} 
          key={p.id}
          selected={project ? p.id === project.id: false}
          handleClick={() => chooseProject(p)}
        />
      ))}
      <Tooltip title='create project' placement="bottom">
        <ListItem button onClick={() => addNewProject()}>
        <ListItemAvatar>
          <Avatar variant='rounded' className={classes.avatarPlus}>
            <AddIcon/>
          </Avatar>
        </ListItemAvatar>
      </ListItem>
      </Tooltip>
    </List>
  )
}
