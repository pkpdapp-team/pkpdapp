import React from 'react';
import { useForm } from 'react-hook-form';
import { Button, Box, Typography, CircularProgress, Container, CssBaseline, Stack, Alert } from '@mui/material';
import FloatField from '../../components/FloatField';
import { ReactComponent as PkpdAppIcon } from "../../logo_pkpdapp_with_text.svg";
import { css } from '@emotion/react';

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
  const { register, handleSubmit, control } = useForm<LoginFormInputs>();

  const onSubmit = (data: LoginFormInputs) => {
    onLogin(data.username, data.password);
  };

  return (
    <Container component="main" maxWidth="xs">
    <CssBaseline />
    <form onSubmit={handleSubmit(onSubmit)}>
    <Stack spacing={2} sx={{ marginTop: 10 }}>
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
    >
      <PkpdAppIcon style={{ width: 250 }}/>
    </Box>
      <Typography variant="h5">Login</Typography>
      <FloatField label="Username" name="username" control={control} textFieldProps={{autoComplete: "username"}}/>
      <FloatField label="Password" name="password" control={control} textFieldProps={{autoComplete: "password", type: "password"}}/>
      <Button
        type="submit"
        variant="contained"
        color="primary"
        disabled={isLoading}
      >
        {isLoading ? <CircularProgress size={24} /> : 'Login'}
      </Button>
      {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

    </Stack>
    </form>
    </Container>
  );
};

export default Login;
