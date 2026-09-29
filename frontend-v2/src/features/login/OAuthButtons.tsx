import { FC } from "react";
import { Button, Divider, Stack } from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import GitHubIcon from "@mui/icons-material/GitHub";

/**
 * "Continue with Google / GitHub" buttons.
 *
 * Authentication is handled entirely server-side by django-allauth: clicking a
 * button performs a full-page navigation to the provider login URL, allauth
 * runs the OAuth dance and sets the session cookie, then redirects back to the
 * SPA where `fetchSession()` picks up the authenticated session. No OAuth
 * client library or secret is needed in the browser.
 */
const OAuthButtons: FC<{ disabled?: boolean }> = ({ disabled }) => {
  return (
    <Stack spacing={2}>
      <Divider>or</Divider>
      <Button
        variant="outlined"
        color="primary"
        startIcon={<GoogleIcon />}
        disabled={disabled}
        href="/accounts/google/login/"
      >
        Continue with Google
      </Button>
      <Button
        variant="outlined"
        color="primary"
        startIcon={<GitHubIcon />}
        disabled={disabled}
        href="/accounts/github/login/"
      >
        Continue with GitHub
      </Button>
    </Stack>
  );
};

export default OAuthButtons;
