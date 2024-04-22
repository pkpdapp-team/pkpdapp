import { useEffect, useState } from "react";
import useProtocols from "./useProtocols";
import {
  CombinedModelRead,
  Simulate,
  SimulateResponse,
  useCombinedModelSimulateCreateMutation
} from "../../app/backendApi";
interface ErrorObject {
  error: string;
}

export default function useSimulation(
  simInputs: Simulate,
  simulatedVariables: { qname: string; value: number | undefined }[],
  model: CombinedModelRead | undefined
) {
  const { compound, protocols } = useProtocols();
  const [loadingSimulate, setLoadingSimulate] = useState<boolean>(false);
  const [data, setData] = useState<SimulateResponse[]>([]);
  const [simulate, { error: simulateErrorBase }] =
    useCombinedModelSimulateCreateMutation();
  const simulateError: ErrorObject | undefined = simulateErrorBase
    ? "data" in simulateErrorBase
      ? (simulateErrorBase.data as ErrorObject)
      : { error: "Unknown error" }
    : undefined;

  useEffect(() => {
    let ignore = false;
    if (
      simInputs.outputs?.length > 1 &&
      simInputs.time_max &&
      model &&
      protocols &&
      compound
    ) {
      setLoadingSimulate(true);
      console.log("Simulating with params", simulatedVariables);
      simulate({
        id: model.id,
        simulate: simInputs,
      }).then((response) => {
        if (!ignore) {
          setLoadingSimulate(false);
          if ("data" in response) {
            const responseData = response.data as SimulateResponse[];
            setData(responseData);
          }
        }
      });
    }
    return () => {
      ignore = true;
    };
  }, [
    compound,
    model,
    protocols,
    simulate,
    simInputs,
    simulatedVariables
  ]);

  return {
    loadingSimulate,
    data,
    error: simulateError
  };
}