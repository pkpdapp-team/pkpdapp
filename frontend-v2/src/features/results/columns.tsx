import {
  SimulateResponse,
  TimeIntervalRead,
  VariableRead,
} from "../../app/backendApi";

import { Parameter } from "./useParameters";

interface ParametersProps {
  variable?: VariableRead;
  aucVariable?: VariableRead;
  concentrationVariables?: VariableRead[];
  simulation?: SimulateResponse;
  simulations: SimulateResponse[];
  parameter?: Parameter;
  parameters: Parameter[];
  interval?: TimeIntervalRead;
  intervals: TimeIntervalRead[];
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
        header: `${interval.start_time} – ${interval.end_time}`,
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
  if (simulation && variable && !parameter) {
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
