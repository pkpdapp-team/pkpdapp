import { createContext } from "react";
import { MeanSimulateResponse } from "../features/simulation/types";

interface SimulationContextType {
  simulations: MeanSimulateResponse[];
  setSimulations: (simulations: MeanSimulateResponse[]) => void;
}
export const SimulationContext = createContext<SimulationContextType>({
  simulations: [],
  setSimulations: () => {},
});
