import { createContext } from "react";
import { SimulateResponse, TimeIntervalRead } from "../app/backendApi";
import { Thresholds } from "../App";

export const SimulationContext = createContext({
  simulations: [] as SimulateResponse[],
  setSimulations: (simulations: SimulateResponse[]) => {},
  thresholds: {} as Thresholds,
  setThresholds: (thresholds: Thresholds) => {},
});
