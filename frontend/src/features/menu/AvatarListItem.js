import React from "react";

import ListItem from "@mui/material/ListItem";
import ListItemSecondaryAction from "@mui/material/ListItemSecondaryAction";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Checkbox from "@mui/material/Checkbox";
import Box from "@mui/material/Box";
import classNames from "classnames";
import Tooltip from "@mui/material/Tooltip";
import CircularProgress from "@mui/material/CircularProgress";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import Avatar from "@mui/material/Avatar";
import makeStyles from '@mui/styles/makeStyles';

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
        {handleToggle &&
        <ListItemSecondaryAction>
          <Checkbox
            edge="end"
            onChange={handleToggle}
            checked={checked}
          />
        </ListItemSecondaryAction>
        }
      </ListItem>
    </Tooltip>
  );
}
