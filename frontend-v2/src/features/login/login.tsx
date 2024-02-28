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

interface LoginFormInputs {
  username: string;
  password: string;
}

interface LoginProps {
  onLogin: (username: string, password: string) => void;
  isLoading: boolean;
  errorMessage?: string;
}

const { REACT_APP_HELP_URL } = process.env;

const Login: FC<LoginProps> = ({ onLogin, isLoading, errorMessage }) => {
  const { handleSubmit, control } = useForm<LoginFormInputs>();

  const onSubmit = (data: LoginFormInputs) => {
    onLogin(data.username, data.password);
  };

  return (
    <Container component="main" maxWidth="sm">
      <CssBaseline />
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={2} sx={{ marginTop: 10 }}>
          { REACT_APP_HELP_URL &&
            <Typography variant="caption">To get access to pkpd explorer and for other details please consult the <a href={REACT_APP_HELP_URL}>help page</a></Typography>
          }
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
