import React from "react";
import { makeStyles } from "@material-ui/core/styles";

import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";

import Tooltip from "@material-ui/core/Tooltip";

import Collapse from "@material-ui/core/Collapse";
import ExpandLess from "@material-ui/icons/ExpandLess";
import ExpandMore from "@material-ui/icons/ExpandMore";

import Avatar from "@material-ui/core/Avatar";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import AddIcon from "@material-ui/icons/Add";

import AvatarListItem from "./AvatarListItem";

const useStyles = makeStyles((theme) => ({
  avatarPlusSmall: {
    width: theme.spacing(3),
    height: theme.spacing(3),
    backgroundColor: theme.palette.primary.main,
  },
}));

export default function ExpandableListItem({
  icon: Icon,
  items,
  text,
  type,
  disableSave,
  handleClickItem,
  handleNewItem,
}) {
  const classes = useStyles();
  const [open, setOpen] = React.useState(true);

  const handleClick = () => {
    setOpen(!open);
  };

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
          {items.map((item) => {
            const loading = item.status ? item.status === "loading" : false;
            const simulateLoading = item.simulate
              ? item.simulate.status === "loading"
              : type === "pd_model" || type === "pk_model";

            return (
              <AvatarListItem
                key={item.id}
                item={item}
                selected={item.chosen}
                loading={loading | simulateLoading}
                small={true}
                handleClick={() => handleClickItem(item)}
              />
            );
          })}
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
