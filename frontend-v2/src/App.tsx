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
import { Typography } from "@mui/material";

import { SimulationContext } from "./contexts/SimulationContext";
import { SimulateResponse } from "./app/backendApi";

export type TimeInterval = {
  start: number;
  end: number;
  unit: string;
};
export type Thresholds = { [key: string]: number };

const TIME_INTERVALS: TimeInterval[] = [
  { start: 0, end: 168, unit: "h" },
  { start: 168, end: 336, unit: "h" },
  { start: 336, end: 504, unit: "h" },
  { start: 504, end: 672, unit: "h" },
  { start: 672, end: 840, unit: "h" },
];

const THRESHOLDS: Thresholds = {
  C1: 1e4,
  C1_t: 5e4,
  CT1_f: 200,
  CT1_b: 900,
};

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
          <Sidebar />
          <ToastContainer />
        </>
      ) : (
        <Login onLogin={onLogin} isLoading={false} errorMessage={error} />
      )}
      <Typography
        sx={{
          position: "fixed",
          bottom: 0,
          right: 0,
          color: "gray",
          paddingRight: 1,
        }}
      >
        pkpdx version {import.meta.env.VITE_APP_VERSION?.slice(0, 7) || "dev"}
      </Typography>
    </SimulationContext.Provider>
  );
}

export default App;
