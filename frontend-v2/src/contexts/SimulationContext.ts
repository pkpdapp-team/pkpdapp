import { createContext } from "react";
import { CentralSimulateResponse } from "../features/simulation/types";

interface SimulationContextType {
  simulations: CentralSimulateResponse[];
  setSimulations: (simulations: CentralSimulateResponse[]) => void;
}
export const SimulationContext = createContext<SimulationContextType>({
  simulations: [],
  setSimulations: () => {},
});
