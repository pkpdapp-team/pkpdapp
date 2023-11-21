import React from "react";
import { useDispatch } from "react-redux";
import makeStyles from '@mui/styles/makeStyles';
import { useSelector } from "react-redux";

import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";

import TableChartIcon from "@mui/icons-material/TableChart";
import AccessibilityIcon from "@mui/icons-material/Accessibility";
import FunctionsIcon from "@mui/icons-material/Functions";

import CircularProgress from "@mui/material/CircularProgress";
import Tooltip from "@mui/material/Tooltip";

import Collapse from "@mui/material/Collapse";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";

import Avatar from "@mui/material/Avatar";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import AddIcon from "@mui/icons-material/Add";

import AvatarListItem from "./AvatarListItem";

import { selectItem as selectModellingItem } from "../modelling/modellingSlice"
import { addNewDataset, selectDatasetById, selectDatasetIds, toggleDataset } from "../datasets/datasetsSlice.js";
import { addNewPkModel, selectPkModelById, selectPkModelIds, selectWritablePkModelIds, togglePkModel } from "../pkModels/pkModelsSlice.js";
import { addNewPdModel, selectPdModelById, selectPdModelIds, selectWritablePdModelIds, togglePdModel } from "../pdModels/pdModelsSlice.js";
import { addNewProtocol, selectProtocolById, selectProtocolIds, toggleProtocol } from "../protocols/protocolsSlice.js";
import { addNewInference, selectInferenceById, selectInferenceIds, toggleInference } from "../inference/inferenceSlice";

const useStyles = makeStyles((theme) => ({
  avatarPlusSmall: {
    width: theme.spacing(3),
    height: theme.spacing(3),
    backgroundColor: theme.palette.primary.main,
  },
}));

function GenericListItem({id, type, selector, handleToggle, handleClickItem}) {
  const item = useSelector((state) => selector(state, id))
  if (!item) {
    return (null)
  }
  const loading = item.status ? item.status === "loading" : false;
  const simulateLoading = item.simulate
    ? item.simulate.status === "loading"
    : false;

    return (
      <AvatarListItem
        key={item.id}
        item={item}
        selected={item.selected}
        checked={item.chosen}
        loading={loading | simulateLoading}
        small={true}
        handleToggle={handleToggle ? () => handleToggle(item) : null}
        handleClick={() => handleClickItem(item)}
      />
    );
}


export default function ExpandableListItem({
  text,
  type,
  project,
  disableSave,
}) {
  const dispatch = useDispatch();
  const classes = useStyles();
  const [open, setOpen] = React.useState(true);

  const handleClick = () => {
    setOpen(!open);
  };

  let selectorById = null
  let selector = null
  let Icon = null
  let toggle = null
  let addNew = null
  let selectItem = selectModellingItem
  if (type == 'dataset') {
    selectorById  = selectDatasetById
    selector = selectDatasetIds
    Icon = TableChartIcon
    toggle = toggleDataset
    addNew = addNewDataset
  }
  if (type == 'pk_model') {
    selectorById  = selectPkModelById
    selector = selectWritablePkModelIds
    Icon = AccessibilityIcon
    toggle = togglePkModel
    addNew = addNewPkModel
  }
  if (type == 'pd_model') {
    selectorById = selectPdModelById
    selector = selectWritablePdModelIds
    Icon = FunctionsIcon
    toggle = togglePdModel
    addNew = addNewPdModel
  }
  if (type == 'protocol') {
    selector = selectProtocolIds
    selectorById  = selectProtocolById
    Icon = AccessibilityIcon
    toggle = toggleProtocol
    addNew = addNewProtocol
  }
  if (type == 'inference') {
    selector = selectInferenceIds
    selectorById  = selectInferenceById
    Icon = AccessibilityIcon
    toggle = null
    addNew = addNewInference
  }

  const ids = useSelector(selector);
  const handleToggle = toggle ? (item) => dispatch(toggle(item)) : null
  const handleClickItem = (item) => {
    dispatch(selectItem({type: type, id: item.id}));
  }
  const handleNewItem = () => dispatch(addNew(project)).then((arg) => dispatch(selectItem({id: arg.payload.id, type: type})));

  return (
    <React.Fragment>
      <ListItem button onClick={handleClick}>
        <ListItemIcon>
          <Icon />
        </ListItemIcon>
        <ListItemText primary={text} />
        {open ? <ExpandLess /> : <ExpandMore />}
      </ListItem>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <List component="div" dense disablePadding>
          {ids && ids.map((id) => (
            <GenericListItem
              key={id}
              type={type}
              id={id}
              selector={selectorById}
              handleToggle={handleToggle}
              handleClickItem={handleClickItem}
            />
          ))}

          {handleNewItem && (
            <Tooltip title={`create ${text}`} placement="bottom">
              <ListItem button onClick={handleNewItem} disabled={disableSave}>
                <ListItemAvatar>
                  <Avatar variant="rounded" className={classes.avatarPlusSmall}>
                    <AddIcon />
                  </Avatar>
                </ListItemAvatar>
              </ListItem>
            </Tooltip>
          )}
        </List>
      </Collapse>
    </React.Fragment>
  );
}
