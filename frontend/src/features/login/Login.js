import { api } from "../../Api";
import { makeStyles } from "@material-ui/core/styles";
import { useSelector, useDispatch } from "react-redux";
import React from "react";
import { Link, useLocation, Redirect } from "react-router-dom";
import Button from "@material-ui/core/Button";
import CssBaseline from "@material-ui/core/CssBaseline";
import Alert from "@material-ui/lab/Alert";
import { useForm } from "react-hook-form";
import Typography from "@material-ui/core/Typography";
import Container from "@material-ui/core/Container";
import { useHistory } from "react-router-dom";
import { FormTextField } from "../forms/FormComponents";
import { ReactComponent as PkpdAppIcon } from "../../logo_pkpdapp_with_text.svg";
import { isAuthenticated, loginError, setCredentials, login } from "../login/loginSlice"

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
  form: {
    width: "100%", // Fix IE 11 issue.
    marginTop: theme.spacing(1),
  },
  submit: {
    margin: theme.spacing(3, 1, 2),
  },
  links: {
    "& > *": {
      margin: theme.spacing(1),
    },
  },
}));

export default function Login() {
  const classes = useStyles();
  const dispatch = useDispatch();
  const { control, handleSubmit } = useForm();

  const navigateBack = useSelector(isAuthenticated);
  const location = useLocation();
  const error = useSelector(loginError);
  const history = useHistory();
  const from = location.state?.referrer || "/";

  if (navigateBack) {
    return <Redirect to={from} replace />
  }


  const onSubmit = ({ username, password }) => {
    console.log("You pressed login", username, password);
    dispatch(login({ username, password }))
  };

  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <div className={classes.paper}>
        <PkpdAppIcon className={classes.icon} />
        <Typography component="h1" variant="h5">
          Sign in
        </Typography>
        <form onSubmit={handleSubmit(onSubmit)}>
          <FormTextField
            variant="outlined"
            fullWidth
            autoFocus
            control={control}
            defaultValue={""}
            name="username"
            label="Username"
            autoComplete="username"
          />
          <FormTextField
            variant="outlined"
            fullWidth
            control={control}
            defaultValue={""}
            name="password"
            label="Password"
            type="password"
            autoComplete="current-password"
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            className={classes.submit}
          >
            Sign In
          </Button>
          {error && <Alert severity="error">{error}</Alert>}
        </form>
      </div>
    </Container>
  );
}
