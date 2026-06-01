import { useCallback, useContext, useEffect, useState } from "react";
import useProtocols from "./useProtocols";
import { SimulationContext } from "../../contexts/SimulationContext";

import {
  CombinedModelRead,
  Simulate,
  SimulateUncertainty,
  SimulateUncertaintyResponse,
  SimulateResponse,
  useCombinedModelSimulateCreateMutation,
  useCombinedModelSimulateUncertaintyCreateMutation,
} from "../../app/backendApi";
import { RootState } from "../../app/store";
import { useSelector } from "react-redux";
import { PageName } from "../main/mainSlice";
interface ErrorObject {
  error: string;
}

const SIMULATION_PAGES = [PageName.SIMULATIONS, PageName.RESULTS];

type SimulateRequest = Simulate & Partial<SimulateUncertainty>;

const hasUncertaintyRequest = (simInputs: SimulateRequest): boolean => {
  const distributions = simInputs.variable_distributions;
  return Boolean(distributions && Object.keys(distributions).length > 0);
};

const uncertaintyToSimulateResponse = (
  response: SimulateUncertaintyResponse[],
): SimulateResponse[] => {
  return response.map((scenario) => ({
    time: scenario.time,
    group: scenario.group ?? null,
    outputs: Object.fromEntries(
      Object.entries(scenario.outputs).map(([variableId, summary]) => [
        variableId,
        summary.mean,
      ]),
    ),
  }));
};

function useFetchSimulations() {
  const [simulate, { error: simulateErrorBase }] =
    useCombinedModelSimulateCreateMutation();
  const [simulateUncertainty, { error: simulateUncertaintyErrorBase }] =
    useCombinedModelSimulateUncertaintyCreateMutation();

  const fetchSimulation = useCallback(
    (model: CombinedModelRead, simInputs: SimulateRequest) => {
      if (hasUncertaintyRequest(simInputs)) {
        return simulateUncertainty({
          id: model.id,
          simulateUncertainty: simInputs,
        });
      }

      return simulate({
        id: model.id,
        simulate: simInputs,
      });
    },
    [simulate, simulateUncertainty],
  );

  return {
    fetchSimulation,
    simulateErrorBase: simulateUncertaintyErrorBase || simulateErrorBase,
  };
}

const simulationCache = new Map<string, SimulateResponse[]>();
const uncertaintySimulationCache = new Map<
  string,
  SimulateUncertaintyResponse[]
>();

export default function useSimulation(
  simInputs: SimulateRequest,
  model: CombinedModelRead | undefined,
  runSimulation: boolean = true,
) {
  const { compound, protocols } = useProtocols();
  const { setSimulations } = useContext(SimulationContext);
  const [loadingSimulate, setLoadingSimulate] = useState<boolean>(false);
  const [data, setData] = useState<SimulateResponse[]>([]);
  const [uncertaintyData, setUncertaintyData] = useState<
    SimulateUncertaintyResponse[]
  >([]);
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

    const simulateModel = async (
      model: CombinedModelRead,
      simInputs: SimulateRequest,
      cacheKey: string,
    ) => {
      setLoadingSimulate(true);
      const response = await fetchSimulation(model, simInputs);
      if (!ignore) {
        if ("data" in response) {
          if (hasUncertaintyRequest(simInputs)) {
            const responseData = response.data as SimulateUncertaintyResponse[];
            const meanData = uncertaintyToSimulateResponse(responseData);
            setData(meanData);
            setUncertaintyData(responseData);
            setSimulations(meanData);
            simulationCache.set(cacheKey, meanData);
            uncertaintySimulationCache.set(cacheKey, responseData);
          } else {
            const responseData = response.data as SimulateResponse[];
            setData(responseData);
            setUncertaintyData([]);
            setSimulations(responseData);
            simulationCache.set(cacheKey, responseData);
            uncertaintySimulationCache.delete(cacheKey);
          }
        }
      }
      setLoadingSimulate(false);
    };

    const simInputs = JSON.parse(serialisedInputs);
    if (
      runSimulation &&
      simInputs.outputs?.length > 1 &&
      simInputs.time_max &&
      model &&
      protocols &&
      compound
    ) {
      const cacheKey = `${model.id}-${serialisedInputs}`;
      /**
       * Clear the cache on any tab except Simulation or Results.
       * This prevents stale data being used after changes to the model or protocols.
       */
      if (SIMULATION_PAGES.includes(page)) {
        console.log("Simulating with inputs", simInputs.variables);
        if (simulationCache.has(cacheKey)) {
          const cachedData = simulationCache.get(cacheKey);
          console.log("Using cached simulation data");
          setData(cachedData || []);
          setSimulations(cachedData || []);
          setUncertaintyData(uncertaintySimulationCache.get(cacheKey) || []);
        } else {
          simulateModel(model, simInputs, cacheKey);
        }
      } else {
        console.log("Clearing simulation cache");
        simulationCache.clear();
        uncertaintySimulationCache.clear();
      }
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
    uncertaintyData,
    error: simulateError,
  };
}
