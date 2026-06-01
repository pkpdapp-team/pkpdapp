import { FC } from "react";
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
} from "@mui/material";
import TextField from "../../components/TextField";
import { defaultAckText } from "../../constants/acknowledgmentText";

interface LoginFormInputs {
  username: string;
  password: string;
}

interface LoginProps {
  onLogin: (username: string, password: string) => void;
  onSignup: () => void;
  isLoading: boolean;
  errorMessage?: string;
}

const { VITE_APP_HELP_URL, VITE_ENABLE_SIGNUP, VITE_APP_ACK_TXT } = import.meta
  .env;

const Login: FC<LoginProps> = ({
  onLogin,
  onSignup,
  isLoading,
  errorMessage,
}) => {
  const { handleSubmit, control } = useForm<LoginFormInputs>();

  const onSubmit = (data: LoginFormInputs) => {
    onLogin(data.username, data.password);
  };

  return (
    <Container component="main" maxWidth="sm">
      <CssBaseline />
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={2} sx={{ marginTop: 10 }}>
          {VITE_APP_HELP_URL && (
            <Typography variant="caption">
              To get access to pkpd explorer and for other details please
              consult the <a href={VITE_APP_HELP_URL}>help page</a>
            </Typography>
          )}
          <Box display="flex" justifyContent="center" alignItems="center">
            <Typography
              variant="h3"
              component="div"
              sx={{
                color: "#1976d2",
                fontWeight: "bold",
                paddingLeft: "1rem",
                fontFamily: "Comfortaa",
              }}
            >
              pkpd explorer
            </Typography>
          </Box>
          <Typography variant="h6">Login</Typography>
          <TextField
            label="Username"
            name="username"
            control={control}
            textFieldProps={{ autoComplete: "username" }}
            mode="onChange"
            autoShrink={true}
          />
          <TextField
            label="Password"
            name="password"
            control={control}
            textFieldProps={{ autoComplete: "password", type: "password" }}
            mode="onChange"
            autoShrink={true}
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={24} /> : "Login"}
          </Button>
          {VITE_ENABLE_SIGNUP === "true" && (
            <Button
              type="button"
              variant="outlined"
              color="primary"
              onClick={onSignup}
              disabled={isLoading}
            >
              Sign Up
            </Button>
          )}
          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        </Stack>
      </form>
      <Typography variant="caption" sx={{ marginTop: 2 }}>
        {VITE_APP_ACK_TXT || defaultAckText}
      </Typography>
    </Container>
  );
};

export default Login;
