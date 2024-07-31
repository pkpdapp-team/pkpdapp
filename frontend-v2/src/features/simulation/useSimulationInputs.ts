import { useMemo } from "react";
import { Simulate, SimulationRead, VariableRead } from "../../app/backendApi";

type SliderValues = { [key: number]: number };

const DEFAULT_INPUTS = {
  variables: {},
  outputs: [],
  time_max: 0,
};

const getSimulateInput = (
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

export default function useSimulationInputs(
  simulation: SimulationRead | undefined,
  sliderValues: SliderValues | undefined,
  variables: VariableRead[] | undefined,
  timeMax: number | undefined,
) {
  return useMemo(
    () =>
      simulation && sliderValues
        ? getSimulateInput(simulation, sliderValues, variables, timeMax)
        : DEFAULT_INPUTS,
    [simulation, sliderValues, variables, timeMax],
  );
}
