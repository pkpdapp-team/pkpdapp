import {
  SimulateResponse,
  TimeIntervalRead,
  VariableListApiResponse,
  VariableRead,
} from "../../app/backendApi";

import { Parameter } from "./useParameters";
import { columns } from "./columns";

/**
 * Given x0 in the range [x[0], x[1]], return the linearly interpolated value y0 in the range [y[0], y[1]].
 * @param x
 * @param y
 * @param x0
 * @returns y0 in the range [y[0], y[1]].
 */
function interpolate(x: [number, number], y: [number, number], x0: number) {
  return y[0] + ((x0 - x[0]) * (y[1] - y[0])) / (x[1] - x[0]);
}

/**
 * Given a list of time intervals, a variable, and a simulation, return a list of values per interval for that variable and simulation.
 * @param timeIntervals
 * @param variable
 * @param simulation
 * @returns interpolated values per interval
 */
export function valuesPerInterval(
  timeIntervals: TimeIntervalRead[],
  variable?: VariableRead,
  simulation?: SimulateResponse,
) {
  const times = simulation?.time || [];
  const values = variable && simulation ? simulation.outputs[variable.id] : [];
  return timeIntervals.map((interval) => {
    if (values.length === 0) {
      return [];
    }
    const startIndex = times.findIndex((t) => t >= interval.start_time);
    const endIndex = times.findIndex((t) => t >= interval.end_time);
    const start =
      startIndex > 0
        ? interpolate(
            [times[startIndex - 1], times[startIndex]],
            [values[startIndex - 1], values[startIndex]],
            interval.start_time,
          )
        : values[0];
    const end =
      endIndex > -1
        ? interpolate(
            [times[endIndex - 1], times[endIndex]],
            [values[endIndex - 1], values[endIndex]],
            interval.end_time,
          )
        : values[values.length - 1];
    const intervalValues = [
      start,
      ...values.slice(startIndex + 1, endIndex - 1),
      end,
    ];
    return intervalValues;
  });
}

/**
 * Given a list of times and a list of time intervals, return a list of times per interval.
 * @param times
 * @param timeIntervals
 * @returns times per interval
 */
export function timesPerInterval(
  times: number[],
  timeIntervals: TimeIntervalRead[],
) {
  return timeIntervals.map((interval) => {
    const startIndex = times.findIndex((t) => t >= interval.start_time);
    const endIndex = times.findIndex((t) => t >= interval.end_time);
    return [
      interval.start_time,
      ...times.slice(startIndex + 1, endIndex - 1),
      interval.end_time,
    ];
  });
}

/**
 * Find the first pair of points where intervalValues crosses the threshold, starting from startIndex.
 * @param intervalTimes
 * @param intervalValues
 * @param threshold
 * @param startIndex
 * @returns [time, index] where time is the time the threshold was exceeded and index is the index of the last crossing point.
 */
export function thresholdCrossingPoints(
  intervalTimes: number[],
  intervalValues: number[],
  threshold: number,
  startIndex: number = 0,
) {
  const thresholdStart = intervalValues.findIndex(
    (v, i) => i >= startIndex && v >= threshold,
  );
  const thresholdEnd =
    thresholdStart === -1 // threshold never reached
      ? -1
      : intervalValues.findIndex((v, i) => i > thresholdStart && v < threshold);
  const startTime =
    thresholdStart > 0
      ? interpolate(
          [intervalValues[thresholdStart - 1], intervalValues[thresholdStart]],
          [intervalTimes[thresholdStart - 1], intervalTimes[thresholdStart]],
          threshold,
        )
      : intervalTimes[0];
  const endTime =
    thresholdStart === -1 // threshold never reached
      ? startTime
      : thresholdEnd > 0
        ? interpolate(
            [intervalValues[thresholdEnd - 1], intervalValues[thresholdEnd]],
            [intervalTimes[thresholdEnd - 1], intervalTimes[thresholdEnd]],
            threshold,
          )
        : intervalTimes[intervalTimes.length - 1]; // threshold reached beyond the end of the interval
  return [endTime - startTime, thresholdEnd];
}

/**
 * Given a list of times and corresponding values, calculate the time that the values are above a threshold.
 * @param intervalTimes
 * @param intervalValues
 * @param threshold
 * @returns
 */
export function timeOverThreshold(
  intervalTimes: number[],
  intervalValues: number[],
  threshold: number,
) {
  let cumulativeTime = 0;
  function incrementTime(startIndex: number) {
    const [thresholdTime, endIndex] = thresholdCrossingPoints(
      intervalTimes,
      intervalValues,
      threshold,
      startIndex,
    );
    cumulativeTime += thresholdTime;
    if (endIndex === -1) {
      return;
    }
    incrementTime(endIndex + 1);
  }
  incrementTime(0);
  return cumulativeTime;
}

export function formattedNumber(value: number, threshold: number = 1e4) {
  return value > threshold ? value.toExponential(4) : value.toFixed(2);
}

interface TableRowProps {
  header: string | JSX.Element;
  interval?: TimeIntervalRead;
  intervals: TimeIntervalRead[];
  variables: VariableListApiResponse | undefined;
  simulation?: SimulateResponse;
  simulations: SimulateResponse[];
  parameter?: Parameter;
  parameters: Parameter[];
  variable?: VariableRead;
  concentrationVariables: VariableRead[];
}

export function tableRow({
  header,
  interval,
  intervals,
  variable,
  concentrationVariables,
  variables,
  simulation,
  simulations,
  parameter,
  parameters,
}: TableRowProps) {
  const aucVariable =
    variable && variables?.find((v) => v.name === `calc_${variable.name}_AUC`);
  const tableColumns = columns({
    variable,
    aucVariable,
    concentrationVariables,
    simulation,
    simulations,
    parameter,
    parameters,
    interval,
    intervals,
  });
  const values = tableColumns.map((column, index) => {
    return column.value(
      interval ? intervals.indexOf(interval) : index,
      simulation ? simulation : simulations[index],
      variable ? variable : concentrationVariables[index],
    );
  });
  return { header, values };
}
