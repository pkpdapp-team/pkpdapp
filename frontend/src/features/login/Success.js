import makeStyles from '@mui/styles/makeStyles';
import React from "react";
import { Link } from "react-router-dom";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import { ReactComponent as PkpdAppIcon } from "../../logo_pkpdapp_with_text.svg";

const useStyles = makeStyles((theme) => ({
  paper: {
    marginTop: theme.spacing(8),
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  icon: {
    margin: theme.spacing(3),
    width: theme.spacing(20),
    height: theme.spacing(8),
  },
  links: {
    "& > *": {
      margin: theme.spacing(1),
    },
  },
}));

export default function Success({ text }) {
  const classes = useStyles();

  return (
    <Container component="main" maxWidth="xs">
      <div className={classes.paper}>
        <PkpdAppIcon className={classes.icon} />
        <Typography component="h1" variant="h5">
          Success
        </Typography>
        <Typography>{text}</Typography>
        <div className={classes.links}>
          <Link to="/login">Login</Link>
        </div>
      </div>
    </Container>
  );
}
