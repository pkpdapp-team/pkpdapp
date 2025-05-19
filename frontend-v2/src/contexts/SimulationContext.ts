import { createContext } from "react";
import { SimulateResponse } from "../app/backendApi";

interface SimulationContextType {
  simulations: SimulateResponse[];
  setSimulations: (simulations: SimulateResponse[]) => void;
}
export const SimulationContext = createContext<SimulationContextType>({
  simulations: [],
  setSimulations: () => {},
});
