import { FC } from "react";

import { VariableRead } from "../../app/backendApi";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";

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
  const auc = Math.max(...aucValues) - Math.min(...aucValues);
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

const VariableTable: FC<{
  variable: VariableRead;
  values: number[];
  aucValues: number[];
  times: number[];
}> = ({ variable, values = [], aucValues = [], times = [] }) => {
  const valuesPerInterval = timeIntervals.map((interval) => {
    const intervalValues = values.filter(
      (_, index) =>
        times[index] >= interval.start && times[index] <= interval.end,
    );
    return intervalValues;
  });
  const aucPerInterval = timeIntervals.map((interval) => {
    const intervalValues = aucValues.filter(
      (_, index) =>
        times[index] >= interval.start && times[index] <= interval.end,
    );
    return intervalValues;
  });
  const timeOverThresholdPerInterval = timeIntervals.map((interval, k) => {
    const intervalValues = valuesPerInterval[k];
    const intervalTimes = times.filter(
      (t) => t >= interval.start && t <= interval.end,
    );
    const threshold = thresholds[variable.name];
    const timesOverThreshold = intervalTimes.filter(
      (t, i) => intervalValues[i] >= threshold,
    );
    return Math.max(...timesOverThreshold) - Math.min(...timesOverThreshold);
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
            interval={interval}
            values={valuesPerInterval[k]}
            aucValues={aucPerInterval[k]}
            timeOverThreshold={timeOverThresholdPerInterval[k]}
          />
        ))}
      </TableBody>
    </Table>
  );
};

export default VariableTable;
