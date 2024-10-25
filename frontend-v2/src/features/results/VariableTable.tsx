import { FC, useContext } from "react";

import { UnitListApiResponse, VariableRead } from "../../app/backendApi";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";

import { SimulationContext } from "../../contexts/SimulationContext";
import { TimeInterval } from "../../App";

const IntervalRow: FC<{
  header: string;
  values: string[];
}> = ({ header, values }) => {
  return (
    <TableRow>
      <TableCell scope="row">{header}</TableCell>
      {values.map((value, i) => (
        <TableCell key={i}>{value}</TableCell>
      ))}
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
 * Find the first pair of points where intervalValues crosses the threshold, starting from startIndex.
 * @param intervalTimes
 * @param intervalValues
 * @param threshold
 * @param startIndex
 * @returns [time, index] where time is the time the threshold was exceeded and index is the index of the last crossing point.
 */
function thresholdCrossingPoints(
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

function formattedNumber(value: number) {
  return value > 1e4 ? value.toExponential(4) : value.toFixed(2);
}

const VariableTable: FC<{
  variable: VariableRead;
  aucVariable?: VariableRead;
  timeVariable?: VariableRead;
  values: number[];
  aucValues: number[];
  times: number[];
  units: UnitListApiResponse | undefined;
}> = ({
  variable,
  aucVariable,
  timeVariable,
  values = [],
  aucValues = [],
  times = [],
  units = [],
}) => {
  const { intervals, thresholds } = useContext(SimulationContext);
  const variablePerInterval = valuesPerInterval(intervals, values, times);
  const timePerInterval = timesPerInterval(times, intervals);
  const aucPerInterval = valuesPerInterval(intervals, aucValues, times);
  const timeOverLowerThresholdPerInterval = intervals.map((interval, k) => {
    const intervalValues = variablePerInterval[k];
    const intervalTimes = timePerInterval[k];
    const threshold = thresholds[variable.name];
    return timeOverThreshold(
      intervalTimes,
      intervalValues,
      threshold?.lower || 0,
    );
  });
  const timeOverUpperThresholdPerInterval = intervals.map((interval, k) => {
    const intervalValues = variablePerInterval[k];
    const intervalTimes = timePerInterval[k];
    const threshold = thresholds[variable.name];
    return timeOverThreshold(
      intervalTimes,
      intervalValues,
      threshold?.upper || Infinity,
    );
  });
  const unit = units.find((u) => u.id === variable.unit);
  const aucUnit = aucVariable && units.find((u) => u.id === aucVariable.unit);
  const timeUnit =
    timeVariable && units.find((u) => u.id === timeVariable.unit);

  const headers = [
    "Interval",
    <>
      {variable.name}
      <sub>min</sub> [{unit?.symbol}]
    </>,
    <>
      {variable.name}
      <sub>max</sub> [{unit?.symbol}]
    </>,
    `AUC [${aucUnit?.symbol}]`,
    <>
      Time above lower threshold
      <br />t<sub>lower</sub> [{timeUnit?.symbol}]
    </>,
    <>
      Time above upper threshold
      <br />t<sub>upper</sub> [{timeUnit?.symbol}]
    </>,
    <>
      t<sub>lower</sub> - t<sub>upper</sub> [{timeUnit?.symbol}]
    </>,
  ];
  const rows = intervals.map((interval, k) => {
    const header = `${interval.start} – ${interval.end} ${interval.unit}`;
    const min = Math.min(...variablePerInterval[k]);
    const max = Math.max(...variablePerInterval[k]);
    const auc =
      aucPerInterval[k][aucPerInterval[k].length - 1] - aucPerInterval[k][0];
    const values = [
      formattedNumber(min),
      formattedNumber(max),
      formattedNumber(auc),
      formattedNumber(timeOverLowerThresholdPerInterval[k]),
      formattedNumber(timeOverUpperThresholdPerInterval[k]),
      formattedNumber(
        timeOverLowerThresholdPerInterval[k] -
          timeOverUpperThresholdPerInterval[k],
      ),
    ];
    return { header, values };
  });

  return (
    <Table>
      <TableHead>
        <TableRow>
          {headers.map((header, i) => (
            <TableCell key={i}>{header}</TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <IntervalRow key={row.header} {...row} />
        ))}
      </TableBody>
    </Table>
  );
};

export default VariableTable;
