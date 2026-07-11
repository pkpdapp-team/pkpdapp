import { useEffect, useState } from "react";
import "./App.css";

import {
  fetchSession,
  isAuthenticated,
  login,
  signup,
  selectSignupMessage,
} from "./features/login/loginSlice";
import { useSelector } from "react-redux";
import Login from "./features/login/login";
import Signup from "./features/login/signup";
import Sidebar from "./features/main/Sidebar";
import { useAppDispatch } from "./app/hooks";
import { RootState } from "./app/store";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { SimulationContext } from "./contexts/SimulationContext";
import { CentralSimulateResponse } from "./features/simulation/types";
import { CollapsibleSidebarProvider } from "./shared/contexts/CollapsibleSidebarContext";
import { ProjectDescriptionProvider } from "./shared/contexts/ProjectDescriptionContext";
import { PageName, setPage } from "./features/main/mainSlice";

function App() {
  const dispatch = useAppDispatch();
  const isAuth = useSelector(isAuthenticated);
  const error = useSelector((state: RootState) => state.login.error);
  const signupMessage = useSelector(selectSignupMessage);
  const [simulations, setSimulations] = useState<CentralSimulateResponse[]>([]);
  const [showSignup, setShowSignup] = useState<boolean>(false);
  const simulationContext = {
    simulations,
    setSimulations,
  };

  const onLogin = (username: string, password: string) => {
    dispatch(login({ username, password }));
    dispatch(setPage(PageName.PROJECTS));
  };

  const onSignup = (userData: { password: string; email: string }) => {
    // Registration does not log the user in. On success, the signup screen
    // shows a "verify your email" message (signupMessage); the user logs in
    // after clicking the verification link in their email.
    dispatch(signup(userData));
  };

  const handleShowSignup = () => {
    setShowSignup(true);
  };

  const handleBackToLogin = () => {
    setShowSignup(false);
  };

  useEffect(() => {
    dispatch(fetchSession());
  }, [dispatch]);

  // Show feedback after the user returns from clicking the email verification
  // link (the backend redirects to /?verified=1 on success, /?verified=0 on
  // failure), then clean the query parameter from the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verified = params.get("verified");
    if (verified === "1") {
      toast.success("Email verified! You can now log in.");
    } else if (verified === "0") {
      toast.error("Email verification link is invalid or has expired.");
    }
    if (verified !== null) {
      params.delete("verified");
      const query = params.toString();
      window.history.replaceState(
        {},
        "",
        window.location.pathname + (query ? `?${query}` : ""),
      );
    }
  }, []);

  // Reset signup state when user logs out
  useEffect(() => {
    if (!isAuth) {
      setShowSignup(false);
    }
  }, [isAuth]);

  return (
    <SimulationContext.Provider value={simulationContext}>
      <ToastContainer />
      {isAuth ? (
        <>
          <CollapsibleSidebarProvider>
            <ProjectDescriptionProvider>
              <Sidebar />
            </ProjectDescriptionProvider>
          </CollapsibleSidebarProvider>
        </>
      ) : showSignup ? (
        <Signup
          onSignup={onSignup}
          onBack={handleBackToLogin}
          isLoading={false}
          errorMessage={error}
          successMessage={signupMessage}
        />
      ) : (
        <Login
          onLogin={onLogin}
          onSignup={handleShowSignup}
          isLoading={false}
          errorMessage={error}
        />
      )}
    </SimulationContext.Provider>
  );
}

export default App;
