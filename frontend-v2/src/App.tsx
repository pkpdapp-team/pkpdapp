import { useEffect, useState } from "react";
import "./App.css";

import {
  fetchSession,
  isAuthenticated,
  login,
} from "./features/login/loginSlice";
import { useSelector } from "react-redux";
import Login from "./features/login/login";
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
  const simulationContext = {
    simulations,
    setSimulations,
  };

  const onLogin = (username: string, password: string) => {
    dispatch(login({ username, password }));
    dispatch(setPage(PageName.PROJECTS));
  };

  useEffect(() => {
    dispatch(fetchSession());
  }, [dispatch]);

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
      ) : (
        <Login onLogin={onLogin} isLoading={false} errorMessage={error} />
      )}
    </SimulationContext.Provider>
  );
}

export default App;
