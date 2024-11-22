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

export type TimeInterval = {
  start: number;
  end: number;
  unit: { [key: string]: string };
};
type Threshold = { lower: number; upper: number };
export type Thresholds = { [key: string]: Threshold };

const TIME_INTERVALS: TimeInterval[] = [];

const THRESHOLDS: Thresholds = {};

function App() {
  const dispatch = useAppDispatch();
  const isAuth = useSelector(isAuthenticated);
  const error = useSelector((state: RootState) => state.login.error);
  const [simulations, setSimulations] = useState<SimulateResponse[]>([]);
  const [intervals, setIntervals] = useState<TimeInterval[]>(TIME_INTERVALS);
  const [thresholds, setThresholds] = useState<Thresholds>(THRESHOLDS);
  const simulationContext = {
    simulations,
    setSimulations,
    intervals,
    setIntervals,
    thresholds,
    setThresholds,
  };

  const onLogin = (username: string, password: string) => {
    dispatch(login({ username, password }));
  };

  useEffect(() => {
    dispatch(fetchSession());
  }, [dispatch]);

  return (
    <SimulationContext.Provider value={simulationContext}>
      {isAuth ? (
        <>
          <CollapsibleSidebarProvider>
            <Sidebar />
            <ToastContainer />
          </CollapsibleSidebarProvider>
        </>
      ) : (
        <Login onLogin={onLogin} isLoading={false} errorMessage={error} />
      )}
    </SimulationContext.Provider>
  );
}

export default App;
