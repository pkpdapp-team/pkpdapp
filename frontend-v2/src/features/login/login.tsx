import React from 'react';
import { useForm } from 'react-hook-form';
import { TextField, Button, Box, Typography, CircularProgress } from '@mui/material';
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

const formStyles = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  margin: 'auto',
  maxWidth: '500px',
});

const textFieldStyles = css({
  marginBottom: '16px',
});

const buttonStyles = css({
  marginTop: '16px',
});

const errorStyles = css({
  color: 'red',
  textAlign: 'center',
  marginTop: '16px',
});

const Login: React.FC<LoginProps> = ({ onLogin, isLoading, errorMessage }) => {
  const { register, handleSubmit } = useForm<LoginFormInputs>();

  const onSubmit = (data: LoginFormInputs) => {
    onLogin(data.username, data.password);
  };

  return (
    <Box mt={10}>
      <form onSubmit={handleSubmit(onSubmit)} css={formStyles}>
        <Typography variant="h5">Login</Typography>
        <TextField
          type="text"
          label="Username"
          {...register('username')}
          css={textFieldStyles}
        />
        <TextField
          type="password"
          label="Password"
          {...register('password')}
          css={textFieldStyles}
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={isLoading}
          css={buttonStyles}
        >
          {isLoading ? <CircularProgress size={24} /> : 'Login'}
        </Button>
        {errorMessage && <Typography css={errorStyles}>{errorMessage}</Typography>}
      </form>
    </Box>
  );
};

export default Login;
