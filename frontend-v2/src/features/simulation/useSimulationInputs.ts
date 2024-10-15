import { useMemo } from "react";
import {
  CombinedModelRead,
  Simulate,
  SimulationRead,
  VariableRead,
} from "../../app/backendApi";

type SliderValues = { [key: number]: number };

const DEFAULT_INPUTS = {
  variables: {},
  outputs: [],
  time_max: 0,
};

const getSimulateInput = (
  model: CombinedModelRead,
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
  // include variables with secondary parameters, for the Results page.
  const derivedType = "AUC";
  const results = variables?.filter((v) =>
    model.derived_variables?.find(
      (dv) => dv.pk_variable === v.id && dv.type === derivedType,
    ),
  );
  results?.forEach((v) => {
    outputs.push(v.qname);
    outputs.push(`PKCompartment.calc_${v.name}_${derivedType}`);
  });

  return {
    variables: simulateVariables,
    outputs,
    time_max: timeMax || undefined,
  };
};

export default function useSimulationInputs(
  model: CombinedModelRead | undefined,
  simulation: SimulationRead | undefined,
  sliderValues: SliderValues | undefined,
  variables: VariableRead[] | undefined,
  timeMax: number | undefined,
) {
  return useMemo(
    () =>
      model && simulation && sliderValues
        ? getSimulateInput(model, simulation, sliderValues, variables, timeMax)
        : DEFAULT_INPUTS,
    [simulation, sliderValues, variables, timeMax],
  );
}
