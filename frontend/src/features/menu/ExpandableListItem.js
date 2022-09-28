import React from "react";
import { useDispatch } from "react-redux";
import { makeStyles } from "@material-ui/core/styles";
import { useSelector } from "react-redux";

import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";

import TableChartIcon from "@material-ui/icons/TableChart";
import AccessibilityIcon from "@material-ui/icons/Accessibility";
import FunctionsIcon from "@material-ui/icons/Functions";

import CircularProgress from "@material-ui/core/CircularProgress";
import Tooltip from "@material-ui/core/Tooltip";

import Collapse from "@material-ui/core/Collapse";
import ExpandLess from "@material-ui/icons/ExpandLess";
import ExpandMore from "@material-ui/icons/ExpandMore";

import Avatar from "@material-ui/core/Avatar";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import AddIcon from "@material-ui/icons/Add";

import AvatarListItem from "./AvatarListItem";

import { selectItem } from "../modelling/modellingSlice"
import { addNewDataset, selectDatasetById, selectDatasetIds, toggleDataset } from "../datasets/datasetsSlice.js";
import { addNewPkModel, selectPkModelById, selectPkModelIds, selectWritablePkModelIds, togglePkModel } from "../pkModels/pkModelsSlice.js";
import { addNewPdModel, selectPdModelById, selectPdModelIds, selectWritablePdModelIds, togglePdModel } from "../pdModels/pdModelsSlice.js";
import { addNewProtocol, selectProtocolById, selectProtocolIds, toggleProtocol } from "../protocols/protocolsSlice.js";

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
    : type === "pd_model" || type === "pk_model" || type === "pkpd_model";

    return (
      <AvatarListItem
        key={item.id}
        item={item}
        selected={item.selected}
        checked={item.chosen}
        loading={loading | simulateLoading}
        small={true}
        handleToggle={() => handleToggle(item)}
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

  const ids = useSelector(selector);
  const handleToggle = (item) => dispatch(toggle(item))
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
