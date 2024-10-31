import { SimulateResponse, VariableRead } from "../../app/backendApi";
import { TimeInterval } from "../../App";

import { Parameter } from "./useParameters";

interface ParametersProps {
  variable?: VariableRead;
  aucVariable?: VariableRead;
  concentrationVariables?: VariableRead[];
  simulation: SimulateResponse;
  simulations: SimulateResponse[];
  parameter: Parameter;
  parameters: Parameter[];
  interval: TimeInterval;
  intervals: TimeInterval[];
}

export function columns({
  variable,
  aucVariable,
  concentrationVariables = [],
  simulation,
  simulations = [],
  parameter,
  parameters,
  interval,
  intervals = [],
}: ParametersProps) {
  if (parameter && !variable) {
    return concentrationVariables.map((variable) => {
      return {
        header: variable.name,
        value: parameter.value,
      };
    });
  }
  if (parameter && !interval) {
    return intervals.map((interval) => {
      return {
        header: `${interval.start} – ${interval.end}`,
        value: parameter.value,
      };
    });
  }
  if (parameter && !simulation) {
    return simulations.map(() => {
      return {
        header: "TODO",
        value: parameter.value,
      };
    });
  }
  if (variable && !parameter) {
    return parameters.map((parameter) => {
      return {
        header: parameter.name,
        value: (intervalIndex: number) =>
          parameter.value(intervalIndex, simulation, variable, aucVariable),
      };
    });
  }
  return [];
}
