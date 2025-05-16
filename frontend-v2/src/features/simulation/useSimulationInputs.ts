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

enum simulationInputMode {
  REQUESTED_OUTPUTS = "REQUESTED",
  ALL_OUTPUTS = "ALL",
  ALL_OUTPUTS_NO_AMOUNTS = "ALL_NO_AMOUNTS",
}

const getSimulateInput = (
  model: CombinedModelRead,
  simulation: SimulationRead,
  sliderValues: SliderValues,
  variables?: VariableRead[],
  timeMax?: number,
  mode: simulationInputMode = simulationInputMode.REQUESTED_OUTPUTS,
): Simulate => {
  const outputs: string[] = [];

  const constantVariables = variables?.filter((v) => v.constant) || [];
  const simulateVariables: { [key: string]: number } = {};
  constantVariables.forEach((v: VariableRead) => {
    const result = { qname: v.qname, value: v.default_value || 0 };
    if (sliderValues && sliderValues[v.id]) {
      result.value = sliderValues[v.id];
    }
    simulateVariables[result.qname] = result.value;
  });

  if (mode == simulationInputMode.ALL_OUTPUTS) {
    for (const v of variables || []) {
      if (!v.constant) {
        outputs.push(v.qname);
      }
    }
  } else if (mode == simulationInputMode.ALL_OUTPUTS_NO_AMOUNTS) {
    const amountNames = ["Aa", "A1", "A2", "A3"];
    for (const v of variables || []) {
      const isAmount = model.is_library_model && amountNames.includes(v.name);
      if (!v.constant && !isAmount) {
        outputs.push(v.qname);
      }
    }
    for (const plot of simulation?.plots || []) {
      for (const y_axis of plot.y_axes) {
        const variable = variables?.find((v) => v.id === y_axis.variable);
        if (variable && !outputs.includes(variable.qname)) {
          outputs.push(variable.qname);
        }
      }
    }
  } else if (mode == simulationInputMode.REQUESTED_OUTPUTS) {
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
        ? getSimulateInput(
            model,
            simulation,
            sliderValues,
            variables,
            timeMax,
            simulationInputMode.ALL_OUTPUTS_NO_AMOUNTS,
          )
        : DEFAULT_INPUTS,
    [model, simulation, sliderValues, variables, timeMax],
  );
}
