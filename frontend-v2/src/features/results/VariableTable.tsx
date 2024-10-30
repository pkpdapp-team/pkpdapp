import { FC } from "react";

import { UnitRead, VariableRead } from "../../app/backendApi";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";

import { SimulateResponse } from "../../app/backendApi";
import { parameters } from "./parameters";

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

type TableRow = {
  header: string;
  values: string[];
};

const VariableTable: FC<{
  rowColumn: string;
  rows: TableRow[];
  timeVariable?: VariableRead;
  simulation: SimulateResponse;
  unit?: UnitRead;
  aucUnit?: UnitRead;
  timeUnit?: UnitRead;
}> = ({ rowColumn, rows, simulation, unit, aucUnit, timeUnit }) => {
  const columns = parameters({
    simulation,
    unit,
    aucUnit,
    timeUnit,
  });

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>{rowColumn}</TableCell>
          {columns.map((column, i) => (
            <TableCell key={i}>{column.header}</TableCell>
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
