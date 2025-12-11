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

function useFetchSimulations() {
  const [simulate, { error: simulateErrorBase }] =
    useCombinedModelSimulateCreateMutation();
  const fetchSimulation = useCallback(
    (model: CombinedModelRead, simInputs: Simulate) =>
      simulate({
        id: model.id,
        simulate: simInputs,
      }),
    [simulate],
  );
  return { fetchSimulation, simulateErrorBase };
}

export default function useSimulation(
  simInputs: Simulate,
  model: CombinedModelRead | undefined,
  runSimulation: boolean = true,
) {
  const { compound, protocols } = useProtocols();
  const { setSimulations } = useContext(SimulationContext);
  const [loadingSimulate, setLoadingSimulate] = useState<boolean>(false);
  const [data, setData] = useState<SimulateResponse[]>([]);
  const { fetchSimulation, simulateErrorBase } = useFetchSimulations();
  const simulateError: ErrorObject | undefined = simulateErrorBase
    ? "data" in simulateErrorBase
      ? (simulateErrorBase.data as ErrorObject)
      : { error: "Unknown error" }
    : undefined;
  const page = useSelector((state: RootState) => state.main.selectedPage);
  const serialisedInputs = JSON.stringify(simInputs);

  useEffect(() => {
    let ignore = false;

    async function simulateModel(modelId: number, simInputs: Simulate) {
      setLoadingSimulate(true);
      const response = await fetchSimulation(model!, simInputs);
      if (!ignore) {
        setLoadingSimulate(false);
        if ("data" in response) {
          const responseData = response.data as SimulateResponse[];
          setData(responseData);
          setSimulations(responseData);
        }
      }
    }

    const simInputs = JSON.parse(serialisedInputs);
    if (
      runSimulation &&
      simInputs.outputs?.length > 1 &&
      simInputs.time_max &&
      model &&
      protocols &&
      compound &&
      SIMULATION_PAGES.includes(page)
    ) {
      console.log("Simulating with params", simInputs.variables);
      simulateModel(model.id, simInputs);
    }
    return () => {
      ignore = true;
    };
  }, [
    compound,
    model,
    protocols,
    fetchSimulation,
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
