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
import OAuthButtons from "./OAuthButtons";
import { defaultAckText } from "../../constants/acknowledgmentText";

interface SignupFormInputs {
  password: string;
  confirmPassword: string;
  email: string;
}

interface SignupProps {
  onSignup: (userData: { password: string; email: string }) => void;
  onBack: () => void;
  isLoading: boolean;
  errorMessage?: string;
  successMessage?: string;
}

const { VITE_APP_HELP_URL, VITE_APP_ACK_TXT } = import.meta.env;

const Signup: FC<SignupProps> = ({
  onSignup,
  onBack,
  isLoading,
  errorMessage,
  successMessage,
}) => {
  const { handleSubmit, control, watch } = useForm<SignupFormInputs>();
  const watchPassword = watch("password");

  const onSubmit = (data: SignupFormInputs) => {
    if (data.password !== data.confirmPassword) {
      return; // This will be handled by validation
    }
    onSignup({
      password: data.password,
      email: data.email,
    });
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
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center"
            }}>
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
          <Typography variant="h6">Sign Up</Typography>
          <TextField
            label="Email"
            name="email"
            control={control}
            textFieldProps={{ autoComplete: "email", type: "email" }}
            mode="onChange"
            autoShrink={true}
            rules={{
              required: "Email is required",
              pattern: {
                value: /^\S+@\S+$/i,
                message: "Invalid email address",
              },
            }}
          />
          <TextField
            label="Password"
            name="password"
            control={control}
            textFieldProps={{ autoComplete: "new-password", type: "password" }}
            mode="onChange"
            autoShrink={true}
            rules={{
              required: "Password is required",
              minLength: {
                value: 8,
                message: "Password must be at least 8 characters",
              },
            }}
          />
          <TextField
            label="Confirm Password"
            name="confirmPassword"
            control={control}
            textFieldProps={{ autoComplete: "new-password", type: "password" }}
            mode="onChange"
            autoShrink={true}
            rules={{
              required: "Please confirm your password",
              validate: (value: string) =>
                value === watchPassword || "Passwords do not match",
            }}
          />
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button
              type="button"
              variant="outlined"
              color="primary"
              onClick={onBack}
              disabled={isLoading}
              sx={{ flex: 1 }}
            >
              Back to Login
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={isLoading}
              sx={{ flex: 1 }}
            >
              {isLoading ? <CircularProgress size={24} /> : "Sign Up"}
            </Button>
          </Box>
          <OAuthButtons disabled={isLoading} />
          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
          {successMessage && <Alert severity="success">{successMessage}</Alert>}
        </Stack>
      </form>
      <Typography variant="caption" sx={{ marginTop: 2 }}>
        {VITE_APP_ACK_TXT || defaultAckText}
      </Typography>
    </Container>
  );
};

export default Signup;
