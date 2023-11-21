import React, { useEffect } from "react";
import Paper from "@mui/material/Paper";
import makeStyles from '@mui/styles/makeStyles';
import Button from "@mui/material/Button";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";

const useStyles = makeStyles((theme) => ({
  controls: {
    justifyContent: 'center',
    "& > *": {
      margin: theme.spacing(1),
    },
  },
  toolbar: {
    marginTop: theme.spacing(1),
    backgroundColor: theme.palette.primary.main,
    position: 'sticky',
    bottom: 0,
    borderRadius: '0 0 5px 5px',
  }
}));

export default function Footer({ buttons, disableSave, variant }) {
  const classes = useStyles();
  const button = null
  const createButton = (button, i) => {
    if (button.variant == 'fileUpload') {
      return (
        <Button 
          key={i}
          component="label"
          variant="contained" 
        >
          {button.label}
          <input
            type="file"
            hidden
            disabled={disableSave}
            onChange={button.handle}
          />
        </Button>
      )
    } else {
      return(
        <Button 
          key={i}
          variant="contained" 
          onClick={button.handle}
          disabled={disableSave}
        >
          {button.label}
        </Button>

      )
    }
  };

  return (
    <Paper className={classes.toolbar} elevation={0}>
      <Toolbar className={classes.controls} variant='dense'>
        {buttons.map(createButton)}
      </Toolbar>
      </Paper>
  )
}
