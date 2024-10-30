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

export type TimeInterval = {
  start: number;
  end: number;
  unit: string;
};
type Threshold = { lower: number; upper: number };
export type Thresholds = { [key: string]: Threshold };

const TIME_INTERVALS: TimeInterval[] = [
  { start: 0, end: 168, unit: "h" },
  { start: 168, end: 336, unit: "h" },
  { start: 336, end: 504, unit: "h" },
  { start: 504, end: 672, unit: "h" },
  { start: 672, end: 840, unit: "h" },
];

const THRESHOLDS: Thresholds = {
  C1: {
    lower: 1e4,
    upper: Infinity,
  },
  C1_t: {
    lower: 5e4,
    upper: Infinity,
  },
  CT1_f: {
    lower: 200,
    upper: Infinity,
  },
  CT1_b: {
    lower: 900,
    upper: Infinity,
  },
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
