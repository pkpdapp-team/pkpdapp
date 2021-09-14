import React, { useEffect } from "react";

import { makeStyles } from '@material-ui/core/styles';
import { useSelector, useDispatch } from 'react-redux'
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import AddIcon from '@material-ui/icons/Add';

import Tooltip from '@material-ui/core/Tooltip';

import ListItemAvatar from '@material-ui/core/ListItemAvatar';
import Avatar from '@material-ui/core/Avatar';

import AvatarListItem from '../menu/AvatarListItem'
import {
  selectAllProjects, selectChosenProject, 
  chooseProject, addNewProject, fetchProjects,
  fetchUnits,
} from '../projects/projectsSlice.js'

import {
  fetchUsers,
} from '../projects/usersSlice.js'

import {
  fetchUnits,
} from '../projects/unitsSlice.js'

import {
  fetchDatasets,
} from '../datasets/datasetsSlice.js'

import {
  fetchPkModels,
} from '../pkModels/pkModelsSlice.js'

import {
  fetchPdModels,
} from '../pdModels/pdModelsSlice.js'

import {
  fetchBasePkModels
} from '../pkModels/basePkModelsSlice.js'

import {
  fetchProtocols 
} from '../protocols/protocolsSlice.js'


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

  

  return (
    <List>
      {projects.map((p) => (
        <AvatarListItem
          item={p} 
          key={p.id}
          selected={project ? p.id === project.id: false}
          handleClick={() => {
            dispatch(chooseProject(p))
            dispatch(fetchDatasets(p))
            dispatch(fetchPkModels(p))
            dispatch(fetchPdModels(p))
            dispatch(fetchPkModels(p))
            dispatch(fetchBasePkModels(p))
            dispatch(fetchProtocols(p))
            dispatch(fetchUnits(p))
          }}
        />
      ))}
      <ListItem button onClick={() => dispatch(addNewProject())}>
        <ListItemAvatar>
          <Tooltip title='create project' placement="bottom">
          <Avatar variant='rounded' className={classes.avatarPlus}>
            <AddIcon/>
          </Avatar>
          </Tooltip>
        </ListItemAvatar>
      </ListItem>
    </List>
  )
}
