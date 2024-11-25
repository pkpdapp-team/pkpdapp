import { useContext } from "react";

import {
  SimulateResponse,
  TimeIntervalRead,
  VariableRead,
} from "../../app/backendApi";
import {
  formattedNumber,
  timeOverThreshold,
  timesPerInterval,
  valuesPerInterval,
} from "./utils";
import { SimulationContext } from "../../contexts/SimulationContext";
import { useVariables } from "./useVariables";
import { Thresholds } from "../../App";
import { useModelTimeIntervals } from "../../hooks/useModelTimeIntervals";

export type Parameter = {
  name: string | JSX.Element;
  value: (
    intervalIndex: number,
    simulation: SimulateResponse,
    variable: VariableRead,
    aucVariable?: VariableRead,
  ) => string;
};

const variablePerInterval = (
  intervals: TimeIntervalRead[],
  variable: VariableRead,
  simulation: SimulateResponse,
  intervalIndex: number,
) => {
  const variableValuesPerInterval = valuesPerInterval(
    intervals,
    variable,
    simulation,
  );
  const intervalValues = variableValuesPerInterval[intervalIndex];
  const timePerInterval = timesPerInterval(simulation.time, intervals);
  const intervalTimes = timePerInterval[intervalIndex];
  return [intervalValues, intervalTimes];
};

const timeOverLowerThresholdPerInterval = (
  intervalValues: number[],
  intervalTimes: number[],
  variable: VariableRead,
  thresholds: Thresholds,
) => {
  const threshold = variable && thresholds[variable.name];
  return timeOverThreshold(
    intervalTimes,
    intervalValues,
    threshold?.lower || 0,
  );
};

const timeOverUpperThresholdPerInterval = (
  intervalValues: number[],
  intervalTimes: number[],
  variable: VariableRead,
  thresholds: Thresholds,
) => {
  const threshold = variable && thresholds[variable.name];
  return timeOverThreshold(
    intervalTimes,
    intervalValues,
    threshold?.upper || Infinity,
  );
};

export function useParameters() {
  const { thresholds } = useContext(SimulationContext);
  const [intervals] = useModelTimeIntervals();
  const variables = useVariables();
  return [
    {
      name: "Min",
      value(
        intervalIndex: number,
        simulation: SimulateResponse,
        variable: VariableRead,
      ) {
        const [intervalValues] = variablePerInterval(
          intervals,
          variable,
          simulation,
          intervalIndex,
        );
        return intervalValues
          ? formattedNumber(Math.min(...intervalValues))
          : 0;
      },
    },
    {
      name: "Max",
      value(
        intervalIndex: number,
        simulation: SimulateResponse,
        variable: VariableRead,
      ) {
        const [intervalValues] = variablePerInterval(
          intervals,
          variable,
          simulation,
          intervalIndex,
        );
        return intervalValues
          ? formattedNumber(Math.max(...intervalValues))
          : 0;
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
        const [auc] = aucVariable
          ? variablePerInterval(
              intervals,
              aucVariable,
              simulation,
              intervalIndex,
            )
          : [];
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
        const [intervalValues, intervalTimes] = variablePerInterval(
          intervals,
          variable,
          simulation,
          intervalIndex,
        );
        return intervalValues
          ? formattedNumber(
              timeOverLowerThresholdPerInterval(
                intervalValues,
                intervalTimes,
                variable,
                thresholds,
              ),
            )
          : 0;
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
        const [intervalValues, intervalTimes] = variablePerInterval(
          intervals,
          variable,
          simulation,
          intervalIndex,
        );
        return intervalValues
          ? formattedNumber(
              timeOverUpperThresholdPerInterval(
                intervalValues,
                intervalTimes,
                variable,
                thresholds,
              ),
            )
          : 0;
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
        const [intervalValues, intervalTimes] = variablePerInterval(
          intervals,
          variable,
          simulation,
          intervalIndex,
        );
        return intervalValues
          ? formattedNumber(
              timeOverLowerThresholdPerInterval(
                intervalValues,
                intervalTimes,
                variable,
                thresholds,
              ) -
                timeOverUpperThresholdPerInterval(
                  intervalValues,
                  intervalTimes,
                  variable,
                  thresholds,
                ),
            )
          : 0;
      },
    },
  ] as Parameter[];
}
