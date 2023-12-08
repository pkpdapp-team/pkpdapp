import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Button,
  Box,
  Typography,
  CircularProgress,
  Container,
  CssBaseline,
  Stack,
  Alert,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { ReactComponent as PkpdAppIcon } from "../../logo_pkpdapp_with_text.svg";
import TextField from "../../components/TextField";
import { useAppDispatch } from "../../app/hooks";
import { fetchCsrf } from "./loginSlice";

interface LoginFormInputs {
  username: string;
  password: string;
}

interface LoginProps {
  onLogin: (username: string, password: string) => void;
  isLoading: boolean;
  errorMessage?: string;
}

const Login: React.FC<LoginProps> = ({ onLogin, isLoading, errorMessage }) => {
  const { handleSubmit, control } = useForm<LoginFormInputs>();
  const dispatch = useAppDispatch();

  const onSubmit = (data: LoginFormInputs) => {
    onLogin(data.username, data.password);
  };

  return (
    <Container component="main" maxWidth="sm">
      <CssBaseline />
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={2} sx={{ marginTop: 10 }}>
          <Box display="flex" justifyContent="center" alignItems="center">
            <PkpdAppIcon style={{ width: 250 }} />
          </Box>
          <Typography variant="h5">Login</Typography>
          <TextField
            label="Username"
            name="username"
            control={control}
            textFieldProps={{ autoComplete: "username" }}
            mode="onChange"
          />
          <TextField
            label="Password"
            name="password"
            control={control}
            textFieldProps={{ autoComplete: "password", type: "password" }}
            mode="onChange"
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={24} /> : "Login"}
          </Button>
          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        </Stack>
      </form>
      <Typography variant="caption" sx={{ marginTop: 2 }}>
        I acknowledge that I am bound by confidentiality obligations imposed
        through my employment or contractual agreement with Roche in connection
        with my access to confidential information, including PKPD Explorer and
        its contents. By entering PKPD Explorer, I confirm that I understand
        that my activities within PKPD Explorer may be monitored consistent with
        local law, and all contents and passwords are confidential information,
        and that unauthorized disclosure or use of such confidential information
        may result in disciplinary action including termination of my employment
        or services and/or legal action based on local law." 
      </Typography>
    </Container>
  );
};

export default Login;
