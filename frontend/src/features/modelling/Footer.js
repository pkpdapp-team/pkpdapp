import React, { useEffect } from "react";
import Paper from "@material-ui/core/Paper";
import { makeStyles } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";

const useStyles = makeStyles((theme) => ({
  controls: {
    justifyContent: 'center',
    "& > *": {
      margin: theme.spacing(1),
    },
  },
  toolbar: {
    backgroundColor: theme.palette.primary.main,
    position: 'sticky',
    bottom: 0,
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
    <Paper className={classes.toolbar} elevation={3}>
      <Toolbar className={classes.controls} variant='dense'>
        {buttons.map(createButton)}
      </Toolbar>
      </Paper>
  )
}
