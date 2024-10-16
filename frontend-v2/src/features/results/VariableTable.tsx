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
  interval: { start: number; end: number; unit: string };
  values: number[];
  aucValues: number[];
  timeOverLowerThreshold: number;
  timeOverUpperThreshold: number;
}> = ({
  interval,
  values,
  aucValues,
  timeOverLowerThreshold,
  timeOverUpperThreshold,
}) => {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const auc = aucValues[aucValues.length - 1] - aucValues[0];
  return (
    <TableRow>
      <TableCell scope="row">
        {interval.start} – {interval.end} {interval.unit}
      </TableCell>
      <TableCell>{min > 1e4 ? min.toExponential(4) : min.toFixed(2)}</TableCell>
      <TableCell>{max > 1e4 ? max.toExponential(4) : max.toFixed(2)}</TableCell>
      <TableCell>{auc.toExponential(4)}</TableCell>
      <TableCell>{timeOverLowerThreshold.toFixed(2)}</TableCell>
      <TableCell>{timeOverUpperThreshold.toFixed(2)}</TableCell>
      <TableCell>
        {(timeOverLowerThreshold - timeOverUpperThreshold).toFixed(2)}
      </TableCell>
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
    return timeOverThreshold(intervalTimes, intervalValues, threshold?.lower);
  });
  const timeOverUpperThresholdPerInterval = intervals.map((interval, k) => {
    const intervalValues = variablePerInterval[k];
    const intervalTimes = timePerInterval[k];
    const threshold = thresholds[variable.name];
    return timeOverThreshold(intervalTimes, intervalValues, threshold?.upper);
  });
  const unit = units.find((u) => u.id === variable.unit);
  const aucUnit = aucVariable && units.find((u) => u.id === aucVariable.unit);
  const timeUnit =
    timeVariable && units.find((u) => u.id === timeVariable.unit);

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Interval</TableCell>
          <TableCell>
            {variable.name}
            <sub>min</sub> [{unit?.symbol}]
          </TableCell>
          <TableCell>
            {variable.name}
            <sub>max</sub> [{unit?.symbol}]
          </TableCell>
          <TableCell>AUC [{aucUnit?.symbol}]</TableCell>
          <TableCell>
            Time over lower threshold
            <br />t<sub>lower</sub> [{timeUnit?.symbol}]
          </TableCell>
          <TableCell>
            Time over upper threshold
            <br />t<sub>upper</sub> [{timeUnit?.symbol}]
          </TableCell>
          <TableCell>
            t<sub>lower</sub>-t<sub>upper</sub> [{timeUnit?.symbol}]
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {intervals.map((interval, k) => (
          <IntervalRow
            key={interval.start}
            interval={interval}
            values={variablePerInterval[k]}
            aucValues={aucPerInterval[k]}
            timeOverLowerThreshold={timeOverLowerThresholdPerInterval[k]}
            timeOverUpperThreshold={timeOverUpperThresholdPerInterval[k]}
          />
        ))}
      </TableBody>
    </Table>
  );
};

export default VariableTable;
