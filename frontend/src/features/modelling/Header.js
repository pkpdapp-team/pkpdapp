import React, { useEffect } from "react";
import Paper from "@mui/material/Paper";
import makeStyles from '@mui/styles/makeStyles';
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";

const useStyles = makeStyles((theme) => ({
  topToolbar: {
    backgroundColor: theme.palette.primary.main,
    position: 'sticky',
    top: 0,
    borderRadius: '5px 5px 0 0',
    zIndex: 10,
    marginBottom: theme.spacing(1),
  },
  header: {
    fontWeight:'bold',
    color: theme.palette.primary.contrastText,
  },
}));

export default function Header({ title }) {
  const classes = useStyles();
  return (
    <Paper className={classes.topToolbar} elevation={0}>
      <Toolbar className={classes.controls} variant='dense'>
        <Typography variant='h6' className={classes.header}>{title}</Typography>
      </Toolbar>
    </Paper>
  )
}
