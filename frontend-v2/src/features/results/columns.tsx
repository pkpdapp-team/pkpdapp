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

/**
 * Generate a list of table columns. Each column has a header, and a value function
 * that returns the formatted value for each row in that column.
 */
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
  // variables as colummns
  if (parameter && !variable) {
    return concentrationVariables.map((variable) => {
      return {
        header: variable.name,
        value: parameter.value,
      };
    });
  }
  // time intervals as columns
  if (parameter && !interval) {
    return intervals.map((interval) => {
      return {
        header: `${interval.start_time} – ${interval.end_time}`,
        value: parameter.value,
      };
    });
  }
  // simulations (groups) as columns
  if (parameter && !simulation) {
    return simulations.map(() => {
      return {
        header: "TODO",
        value: parameter.value,
      };
    });
  }
  // secondary parameters as columns
  if (simulation && variable && !parameter) {
    return parameters.map((parameter) => {
      return {
        header: parameter.name,
        value: parameter.value,
      };
    });
  }
  return [];
}
