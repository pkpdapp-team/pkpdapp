import { SimulateResponse, UnitRead, VariableRead } from "../../app/backendApi";
import { TimeInterval, Thresholds } from "../../App";
import {
  formattedNumber,
  valuesPerInterval,
  timesPerInterval,
  timeOverThreshold,
} from "./utils";

interface ParametersProps {
  intervals?: TimeInterval[];
  variable?: VariableRead;
  simulation: SimulateResponse;
  thresholds?: Thresholds;
  aucVariable?: VariableRead;
  unit?: UnitRead;
  aucUnit?: UnitRead;
  timeUnit?: UnitRead;
}

export function parameters({
  intervals = [],
  variable,
  simulation,
  thresholds = {},
  aucVariable,
  unit,
  aucUnit,
  timeUnit,
}: ParametersProps) {
  const variablePerInterval = valuesPerInterval(
    intervals,
    variable,
    simulation,
  );
  const timePerInterval = timesPerInterval(simulation.time, intervals);
  const aucPerInterval = aucVariable
    ? valuesPerInterval(intervals, aucVariable, simulation)
    : [];
  const timeOverLowerThresholdPerInterval = intervals.map((interval, k) => {
    const intervalValues = variablePerInterval[k];
    const intervalTimes = timePerInterval[k];
    const threshold = variable && thresholds[variable.name];
    return timeOverThreshold(
      intervalTimes,
      intervalValues,
      threshold?.lower || 0,
    );
  });
  const timeOverUpperThresholdPerInterval = intervals.map((interval, k) => {
    const intervalValues = variablePerInterval[k];
    const intervalTimes = timePerInterval[k];
    const threshold = variable && thresholds[variable.name];
    return timeOverThreshold(
      intervalTimes,
      intervalValues,
      threshold?.upper || Infinity,
    );
  });
  return [
    {
      header: `Min [${unit?.symbol}]`,
      value: (intervalIndex: number) =>
        formattedNumber(Math.min(...variablePerInterval[intervalIndex])),
    },
    {
      header: `Max [${unit?.symbol}]`,
      value: (intervalIndex: number) =>
        formattedNumber(Math.max(...variablePerInterval[intervalIndex])),
    },
    {
      header: `AUC [${aucUnit?.symbol}]`,
      value: (intervalIndex: number) => {
        const auc = aucPerInterval[intervalIndex];
        return auc ? formattedNumber(auc[auc.length - 1] - auc[0]) : "";
      },
    },
    {
      header: (
        <>
          t<sub>lower</sub>(above) [{timeUnit?.symbol}]
        </>
      ),
      value: (row: number) =>
        formattedNumber(timeOverLowerThresholdPerInterval[row]),
    },
    {
      header: (
        <>
          t<sub>upper</sub>(above) [{timeUnit?.symbol}]
        </>
      ),
      value: (row: number) =>
        formattedNumber(timeOverUpperThresholdPerInterval[row]),
    },
    {
      header: (
        <>
          t<sub>lower</sub> - t<sub>upper</sub> [{timeUnit?.symbol}]
        </>
      ),
      value: (row: number) =>
        formattedNumber(
          timeOverLowerThresholdPerInterval[row] -
            timeOverUpperThresholdPerInterval[row],
        ),
    },
  ];
}
