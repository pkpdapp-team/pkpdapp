import { createContext } from "react";
import { SimulateResponse } from "../app/backendApi";
import { TimeInterval, Thresholds } from "../App";

export const SimulationContext = createContext({
  simulations: [] as SimulateResponse[],
  setSimulations: (simulations: SimulateResponse[]) => {},
  intervals: [] as TimeInterval[],
  setIntervals: (intervals: TimeInterval[]) => {},
  thresholds: {} as Thresholds,
  setThresholds: (thresholds: Thresholds) => {},
});
