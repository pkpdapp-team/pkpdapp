import { createContext } from "react";
import { SimulateResponse } from "../app/backendApi";

export const SimulationContext = createContext({
  simulations: [] as SimulateResponse[],
  setSimulations: (_simulations: SimulateResponse[]) => {},
});
