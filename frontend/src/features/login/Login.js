import { api } from "../../Api";
import makeStyles from '@mui/styles/makeStyles';
import { useSelector, useDispatch } from "react-redux";
import React from "react";
import { Link, useLocation, Redirect } from "react-router-dom";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";  
import Stack from "@mui/material/Stack";
import CssBaseline from "@mui/material/CssBaseline";
import Alert from '@mui/material/Alert';
import { useForm } from "react-hook-form";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import { useHistory } from "react-router-dom";
import { FormTextField } from "../forms/FormComponents";
import { ReactComponent as PkpdAppIcon } from "../../logo_pkpdapp_with_text.svg";
import { isAuthenticated, loginError, setCredentials, login } from "../login/loginSlice"

export default function Login() {
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
    dispatch(login({ username, password }))
  };

  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <form onSubmit={handleSubmit(onSubmit)}>
      <Stack 
        spacing={2} 
      >
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
        >
          <PkpdAppIcon style={{ width: 250 }}/>
        </Box>
        <Typography component="h1" variant="h5">
          Sign in
        </Typography>
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
        >
          Sign In
        </Button>
        {error && <Alert severity="error">{error}</Alert>}
      </Stack>
      </form>
    </Container>
  );
}
