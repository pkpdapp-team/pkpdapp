import { useEffect, useState } from "react";
import "./App.css";

import {
  fetchSession,
  isAuthenticated,
  login,
  signup,
} from "./features/login/loginSlice";
import { useSelector } from "react-redux";
import Login from "./features/login/login";
import Signup from "./features/login/signup";
import Sidebar from "./features/main/Sidebar";
import { useAppDispatch } from "./app/hooks";
import { RootState } from "./app/store";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { SimulationContext } from "./contexts/SimulationContext";
import { SimulateResponse } from "./app/backendApi";
import { CollapsibleSidebarProvider } from "./shared/contexts/CollapsibleSidebarContext";
import { ProjectDescriptionProvider } from "./shared/contexts/ProjectDescriptionContext";
import { PageName, setPage } from "./features/main/mainSlice";

function App() {
  const dispatch = useAppDispatch();
  const isAuth = useSelector(isAuthenticated);
  const error = useSelector((state: RootState) => state.login.error);
  const [simulations, setSimulations] = useState<SimulateResponse[]>([]);
  const [showSignup, setShowSignup] = useState<boolean>(false);
  const simulationContext = {
    simulations,
    setSimulations,
  };

  const onLogin = (username: string, password: string) => {
    dispatch(login({ username, password }));
    dispatch(setPage(PageName.PROJECTS));
  };

  const onSignup = (userData: {
    username: string;
    password: string;
    firstName: string;
    lastName: string;
    email: string;
  }) => {
    dispatch(signup(userData));
    dispatch(setPage(PageName.PROJECTS));
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

  // Reset signup state when user logs out
  useEffect(() => {
    if (!isAuth) {
      setShowSignup(false);
    }
  }, [isAuth]);

  return (
    <SimulationContext.Provider value={simulationContext}>
      {isAuth ? (
        <>
          <CollapsibleSidebarProvider>
            <ProjectDescriptionProvider>
              <Sidebar />
              <ToastContainer />
            </ProjectDescriptionProvider>
          </CollapsibleSidebarProvider>
        </>
      ) : showSignup ? (
        <Signup
          onSignup={onSignup}
          onBack={handleBackToLogin}
          isLoading={false}
          errorMessage={error}
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
