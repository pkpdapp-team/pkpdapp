import React from "react";

import ListItem from "@material-ui/core/ListItem";
import ListItemSecondaryAction from "@material-ui/core/ListItemSecondaryAction";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import Checkbox from "@material-ui/core/Checkbox";
import Box from "@material-ui/core/Box";
import classNames from "classnames";
import Tooltip from "@material-ui/core/Tooltip";
import CircularProgress from "@material-ui/core/CircularProgress";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import Avatar from "@material-ui/core/Avatar";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  nested: {
    paddingLeft: theme.spacing(4),
  },
  colorSelected: {
    backgroundColor: theme.palette.secondary.main,
  },
  avatarSmall: {
    width: theme.spacing(3),
    height: theme.spacing(3),
  },
}));

export default function AvatarListItem({
  nested,
  item,
  selected,
  handleClick,
  handleToggle,
  small,
  checked,
  loading,
}) {
  const classes = useStyles();
  const avatarClassName = classNames(
    small ? classes.avatarSmall : null,
    selected ? classes.colorSelected : null
  );
  const itemClassName = classNames(nested ? classes.nested : null);

  const marginAdjust = -2;

  let avatar = (
    <ListItemAvatar>
      <Avatar className={avatarClassName}>{item.name[0]}</Avatar>
    </ListItemAvatar>
  );
  if (loading) {
    avatar = (
      <ListItemAvatar>
        <CircularProgress size={23} />
      </ListItemAvatar>
    );
  }

  return (
    <Tooltip title={item.name} placement="right" arrow>
      <ListItem button selected={selected} className={itemClassName} onClick={handleClick}>
        <Box mr={marginAdjust}>{avatar}</Box>
        <ListItemText primary={item.name} primaryTypographyProps={{noWrap: true}}/>
        <ListItemSecondaryAction>
          <Checkbox
            edge="end"
            onChange={handleToggle}
            checked={checked}
          />
        </ListItemSecondaryAction>
      </ListItem>
    </Tooltip>
  );
}
