import React, { useEffect } from "react";
import Paper from "@material-ui/core/Paper";
import { makeStyles } from "@material-ui/core/styles";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";

const useStyles = makeStyles((theme) => ({
  topToolbar: {
    backgroundColor: theme.palette.primary.main,
    position: 'sticky',
    top: 0,
  },
  header: {
    fontWeight:'bold',
    color: theme.palette.primary.contrastText,
  },
}));

export default function Header({ title }) {
  const classes = useStyles();
  return (
    <Paper className={classes.topToolbar} elevation={3}>
      <Toolbar className={classes.controls} variant='dense'>
        <Typography variant='h6' className={classes.header}>{title}</Typography>
      </Toolbar>
    </Paper>
  )
}
