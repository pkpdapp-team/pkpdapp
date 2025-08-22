import { useCallback, useContext, useEffect, useState } from "react";
import useProtocols from "./useProtocols";
import { SimulationContext } from "../../contexts/SimulationContext";

import {
  CombinedModelRead,
  Simulate,
  SimulateResponse,
  useCombinedModelSimulateCreateMutation,
} from "../../app/backendApi";
import { RootState } from "../../app/store";
import { useSelector } from "react-redux";
import { PageName } from "../main/mainSlice";
interface ErrorObject {
  error: string;
}

const SIMULATION_PAGES = [PageName.SIMULATIONS, PageName.RESULTS];

export default function useSimulation(
  simInputs: Simulate,
  model: CombinedModelRead | undefined,
  runSimulation: boolean = true,
) {
  const { compound, protocols } = useProtocols();
  const { setSimulations } = useContext(SimulationContext);
  const [loadingSimulate, setLoadingSimulate] = useState<boolean>(false);
  const [data, setData] = useState<SimulateResponse[]>([]);
  const [simulate, { error: simulateErrorBase }] =
    useCombinedModelSimulateCreateMutation();
  const simulateError: ErrorObject | undefined = simulateErrorBase
    ? "data" in simulateErrorBase
      ? (simulateErrorBase.data as ErrorObject)
      : { error: "Unknown error" }
    : undefined;
  const page = useSelector((state: RootState) => state.main.selectedPage);
  const serialisedInputs = JSON.stringify(simInputs);

  useEffect(() => {
    let ignore = false;
    const simInputs = JSON.parse(serialisedInputs);
    if (
      simInputs.outputs?.length > 1 &&
      simInputs.time_max &&
      model &&
      protocols &&
      compound &&
      SIMULATION_PAGES.includes(page)
    ) {
      const runSimulation = async () => {
        setLoadingSimulate(true);
        const response = await simulate({
          id: model.id,
          simulate: simInputs,
        });
        if (!ignore) {
          setLoadingSimulate(false);
          if ("data" in response) {
            const responseData = response.data as SimulateResponse[];
            setData(responseData);
            setSimulations(responseData);
          }
        }
      };
      console.log("Simulating with params", simInputs.variables);
      runSimulation();
    }
    return () => {
      ignore = true;
    };
  }, [
    compound,
    model,
    protocols,
    simulate,
    serialisedInputs,
    page,
    runSimulation,
    setSimulations,
  ]);

  return {
    loadingSimulate,
    data,
    error: simulateError,
  };
}
