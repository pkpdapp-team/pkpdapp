import { useContext } from "react";

import { SimulateResponse, VariableRead } from "../../app/backendApi";
import {
  formattedNumber,
  timeOverThreshold,
  timesPerInterval,
  valuesPerInterval,
} from "./utils";
import { SimulationContext } from "../../contexts/SimulationContext";
import { useVariables } from "./useVariables";

export type Parameter = {
  name: string | JSX.Element;
  value: (
    intervalIndex: number,
    simulation: SimulateResponse,
    variable: VariableRead,
    aucVariable?: VariableRead,
  ) => string;
};

export function useParameters() {
  const { intervals, thresholds } = useContext(SimulationContext);
  const variables = useVariables();
  return [
    {
      name: "Min",
      value(
        intervalIndex: number,
        simulation: SimulateResponse,
        variable: VariableRead,
      ) {
        const variablePerInterval = valuesPerInterval(
          intervals,
          variable,
          simulation,
        );
        return formattedNumber(Math.min(...variablePerInterval[intervalIndex]));
      },
    },
    {
      name: "Max",
      value(
        intervalIndex: number,
        simulation: SimulateResponse,
        variable: VariableRead,
      ) {
        const variablePerInterval = valuesPerInterval(
          intervals,
          variable,
          simulation,
        );
        return formattedNumber(Math.max(...variablePerInterval[intervalIndex]));
      },
    },
    {
      name: "AUC",
      value(
        intervalIndex: number,
        simulation: SimulateResponse,
        variable: VariableRead,
      ) {
        const aucVariable = variables?.find(
          (v) => v.name === `calc_${variable.name}_AUC`,
        );
        const aucPerInterval = aucVariable
          ? valuesPerInterval(intervals, aucVariable, simulation)
          : [];
        const auc = aucPerInterval[intervalIndex];
        return auc ? formattedNumber(auc[auc.length - 1] - auc[0]) : "";
      },
    },
    {
      name: (
        <>
          t<sub>lower</sub>(above)
        </>
      ),
      value(
        intervalIndex: number,
        simulation: SimulateResponse,
        variable: VariableRead,
      ) {
        const timeOverLowerThresholdPerInterval = intervals.map(
          (interval, k) => {
            const variablePerInterval = valuesPerInterval(
              intervals,
              variable,
              simulation,
            );
            const intervalValues = variablePerInterval[k];
            const timePerInterval = timesPerInterval(
              simulation.time,
              intervals,
            );
            const intervalTimes = timePerInterval[k];
            const threshold = variable && thresholds[variable.name];
            return timeOverThreshold(
              intervalTimes,
              intervalValues,
              threshold?.lower || 0,
            );
          },
        );
        return formattedNumber(
          timeOverLowerThresholdPerInterval[intervalIndex],
        );
      },
    },
    {
      name: (
        <>
          t<sub>upper</sub>(above)
        </>
      ),
      value(
        intervalIndex: number,
        simulation: SimulateResponse,
        variable: VariableRead,
      ) {
        const timeOverUpperThresholdPerInterval = intervals.map(
          (interval, k) => {
            const variablePerInterval = valuesPerInterval(
              intervals,
              variable,
              simulation,
            );
            const intervalValues = variablePerInterval[k];
            const timePerInterval = timesPerInterval(
              simulation.time,
              intervals,
            );
            const intervalTimes = timePerInterval[k];
            const threshold = variable && thresholds[variable.name];
            return timeOverThreshold(
              intervalTimes,
              intervalValues,
              threshold?.upper || Infinity,
            );
          },
        );
        return formattedNumber(
          timeOverUpperThresholdPerInterval[intervalIndex],
        );
      },
    },
    {
      name: (
        <>
          t<sub>lower</sub> - t<sub>upper</sub>
        </>
      ),
      value(
        intervalIndex: number,
        simulation: SimulateResponse,
        variable: VariableRead,
      ) {
        const timeOverLowerThresholdPerInterval = intervals.map(
          (interval, k) => {
            const variablePerInterval = valuesPerInterval(
              intervals,
              variable,
              simulation,
            );
            const intervalValues = variablePerInterval[k];
            const timePerInterval = timesPerInterval(
              simulation.time,
              intervals,
            );
            const intervalTimes = timePerInterval[k];
            const threshold = variable && thresholds[variable.name];
            return timeOverThreshold(
              intervalTimes,
              intervalValues,
              threshold?.lower || 0,
            );
          },
        );
        const timeOverUpperThresholdPerInterval = intervals.map(
          (interval, k) => {
            const variablePerInterval = valuesPerInterval(
              intervals,
              variable,
              simulation,
            );
            const intervalValues = variablePerInterval[k];
            const timePerInterval = timesPerInterval(
              simulation.time,
              intervals,
            );
            const intervalTimes = timePerInterval[k];
            const threshold = variable && thresholds[variable.name];
            return timeOverThreshold(
              intervalTimes,
              intervalValues,
              threshold?.upper || Infinity,
            );
          },
        );
        return formattedNumber(
          timeOverLowerThresholdPerInterval[intervalIndex] -
            timeOverUpperThresholdPerInterval[intervalIndex],
        );
      },
    },
  ] as Parameter[];
}
