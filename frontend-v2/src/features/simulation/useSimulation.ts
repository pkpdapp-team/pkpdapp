import { useEffect, useState } from "react";
import useProtocols from "./useProtocols";
import {
  CombinedModelRead,
  Simulate,
  SimulationRead,
  SimulateResponse,
  VariableRead,
  useCombinedModelSimulateCreateMutation
} from "../../app/backendApi";

type SliderValues = { [key: number]: number };
interface ErrorObject {
  error: string;
}

export const getSimulateInput = (
  simulation: SimulationRead,
  sliderValues: SliderValues,
  variables?: VariableRead[],
  timeMax?: number,
  allOutputs: boolean = false,
): Simulate => {
  const outputs: string[] = [];
  const simulateVariables: { [key: string]: number } = {};
  for (const slider of simulation?.sliders || []) {
    if (sliderValues[slider.variable]) {
      const variable = variables?.find((v) => v.id === slider.variable);
      if (variable) {
        simulateVariables[variable.qname] = sliderValues[slider.variable];
      }
    }
  }
  if (allOutputs) {
    for (const v of variables || []) {
      if (!v.constant) {
        outputs.push(v.qname);
      }
    }
  } else {
    for (const plot of simulation?.plots || []) {
      for (const y_axis of plot.y_axes) {
        const variable = variables?.find((v) => v.id === y_axis.variable);
        if (variable && !outputs.includes(variable.qname)) {
          outputs.push(variable.qname);
        }
      }
    }
  }
  // add time as an output
  const timeVariable = variables?.find(
    (v) => v.name === "time" || v.name === "t",
  );
  outputs.push(timeVariable?.qname || "time");

  // for some reason we need to ask for concentration or myokit produces a kink in the output
  const alwaysAsk = ["PKCompartment.C1"];
  for (const v of alwaysAsk) {
    const variable = variables?.find((vv) => vv.qname === v);
    if (variable && !outputs.includes(variable.qname)) {
      outputs.push(variable.qname);
    }
  }
  return {
    variables: simulateVariables,
    outputs,
    time_max: timeMax || undefined,
  };
};

export const getVariablesSimulated = (
  variables?: VariableRead[],
  sliderValues?: SliderValues,
) => {
  const constantVariables = variables?.filter((v) => v.constant) || [];
  const merged = constantVariables.map((v: VariableRead) => {
    const result = { qname: v.qname, value: v.default_value };
    if (sliderValues && sliderValues[v.id]) {
      result.value = sliderValues[v.id];
    }
    return result;
  });
  return merged;
};

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
      simInputs.outputs?.length > 2 &&
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