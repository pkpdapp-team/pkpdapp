import { FC } from "react";

import { VariableRead } from "../../app/backendApi";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";

type TimeInterval = {
  start: number;
  end: number;
  unit: string;
};

const timeIntervals = [
  { start: 0, end: 168, unit: "h" },
  { start: 168, end: 336, unit: "h" },
  { start: 336, end: 504, unit: "h" },
  { start: 504, end: 672, unit: "h" },
  { start: 672, end: 840, unit: "h" },
];

const thresholds: { [key: string]: number } = {
  C1: 1e4,
  C1_t: 5e4,
  CT1_f: 200,
  CT1_b: 900,
};

const IntervalRow: FC<{
  interval: { start: number; end: number; unit: string };
  values: number[];
  aucValues: number[];
  timeOverThreshold: number;
}> = ({ interval, values, aucValues, timeOverThreshold }) => {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const auc = aucValues[aucValues.length - 1] - aucValues[0];
  return (
    <TableRow>
      <TableCell scope="row">
        {interval.start} – {interval.end} {interval.unit}
      </TableCell>
      <TableCell>{min.toFixed(2)}</TableCell>
      <TableCell>{max.toFixed(2)}</TableCell>
      <TableCell>{auc.toFixed(2)}</TableCell>
      <TableCell>{timeOverThreshold.toFixed(2)}</TableCell>
    </TableRow>
  );
};

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
 * Given a list of time intervals, a list of values, and a list of times, return a list of values per interval.
 * @param timeIntervals
 * @param values
 * @param times
 * @returns values per interval
 */
function valuesPerInterval(
  timeIntervals: TimeInterval[],
  values: number[],
  times: number[],
) {
  return timeIntervals.map((interval) => {
    const startIndex = times.findIndex((t) => t >= interval.start);
    const endIndex = times.findIndex((t) => t >= interval.end);
    const start =
      startIndex > 0
        ? interpolate(
            [times[startIndex - 1], times[startIndex]],
            [values[startIndex - 1], values[startIndex]],
            interval.start,
          )
        : values[0];
    const end =
      endIndex > -1
        ? interpolate(
            [times[endIndex - 1], times[endIndex]],
            [values[endIndex - 1], values[endIndex]],
            interval.end,
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
function timesPerInterval(times: number[], timeIntervals: TimeInterval[]) {
  return timeIntervals.map((interval) => {
    const startIndex = times.findIndex((t) => t >= interval.start);
    const endIndex = times.findIndex((t) => t >= interval.end);
    return [
      interval.start,
      ...times.slice(startIndex + 1, endIndex - 1),
      interval.end,
    ];
  });
}

/**
 * Given a list of times and cooresponding values, calculate the time that the values are above a threshold.
 * @param intervalTimes
 * @param intervalValues
 * @param threshold
 * @returns
 */
function timeOverThreshold(
  intervalTimes: number[],
  intervalValues: number[],
  threshold: number,
) {
  const thresholdStart = intervalValues.findIndex((v) => v >= threshold);
  const thresholdEnd = intervalValues.findIndex(
    (v, i) => i > thresholdStart && v < threshold,
  );
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
  return endTime - startTime;
}

const VariableTable: FC<{
  variable: VariableRead;
  values: number[];
  aucValues: number[];
  times: number[];
}> = ({ variable, values = [], aucValues = [], times = [] }) => {
  const variablePerInterval = valuesPerInterval(timeIntervals, values, times);
  const timePerInterval = timesPerInterval(times, timeIntervals);
  const aucPerInterval = valuesPerInterval(timeIntervals, aucValues, times);
  const timeOverThresholdPerInterval = timeIntervals.map((interval, k) => {
    const intervalValues = variablePerInterval[k];
    const intervalTimes = timePerInterval[k];
    const threshold = thresholds[variable.name];
    return timeOverThreshold(intervalTimes, intervalValues, threshold);
  });

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Interval</TableCell>
          <TableCell>
            {variable.name}
            <sub>min</sub>
          </TableCell>
          <TableCell>
            {variable.name}
            <sub>max</sub>
          </TableCell>
          <TableCell>AUC</TableCell>
          <TableCell>Time over threshold</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {timeIntervals.map((interval, k) => (
          <IntervalRow
            key={interval.start}
            interval={interval}
            values={variablePerInterval[k]}
            aucValues={aucPerInterval[k]}
            timeOverThreshold={timeOverThresholdPerInterval[k]}
          />
        ))}
      </TableBody>
    </Table>
  );
};

export default VariableTable;
