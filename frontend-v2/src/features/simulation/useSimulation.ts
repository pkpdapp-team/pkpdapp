import { useCallback, useContext, useEffect, useState } from "react";
import useProtocols from "./useProtocols";
import { SimulationContext } from "../../contexts/SimulationContext";

import {
  CombinedModelRead,
  Simulate,
  SimulateResponse,
  useCombinedModelSimulateCreateMutation,
} from "../../app/backendApi";
import { MeanSimulateResponse } from "./types";
import { simulateResponseToMean } from "./utils";
import { RootState } from "../../app/store";
import { useSelector } from "react-redux";
import { PageName } from "../main/mainSlice";
interface ErrorObject {
  error: string;
}

const SIMULATION_PAGES = [PageName.SIMULATIONS, PageName.RESULTS];

type SimulateRequest = Simulate;

// The response carries spread (and so warrants uncertainty bands) only when more
// than one sample was drawn, i.e. when at least one variable had a distribution.
const hasUncertainty = (response: SimulateResponse[]): boolean =>
  response.some((scenario) => scenario.sample_count > 1);

function useFetchSimulations() {
  const [simulate, { error: simulateErrorBase }] =
    useCombinedModelSimulateCreateMutation();

  const fetchSimulation = useCallback(
    (model: CombinedModelRead, simInputs: SimulateRequest) => {
      return simulate({
        id: model.id,
        simulate: simInputs,
      });
    },
    [simulate],
  );

  return {
    fetchSimulation,
    simulateErrorBase,
  };
}

const simulationCache = new Map<string, MeanSimulateResponse[]>();
const uncertaintySimulationCache = new Map<string, SimulateResponse[]>();

export default function useSimulation(
  simInputs: SimulateRequest,
  model: CombinedModelRead | undefined,
  runSimulation: boolean = true,
) {
  const { compound, protocols } = useProtocols();
  const { setSimulations } = useContext(SimulationContext);
  const [loadingSimulate, setLoadingSimulate] = useState<boolean>(false);
  const [data, setData] = useState<MeanSimulateResponse[]>([]);
  const [uncertaintyData, setUncertaintyData] = useState<SimulateResponse[]>(
    [],
  );
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
          const responseData = response.data as SimulateResponse[];
          const meanData = simulateResponseToMean(responseData);
          setData(meanData);
          setSimulations(meanData);
          simulationCache.set(cacheKey, meanData);
          if (hasUncertainty(responseData)) {
            setUncertaintyData(responseData);
            uncertaintySimulationCache.set(cacheKey, responseData);
          } else {
            setUncertaintyData([]);
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
