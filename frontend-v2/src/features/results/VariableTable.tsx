import { FC, useContext } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";

import { useParameters } from "./useParameters";
import { useConcentrationVariables } from "./useConcentrationVariables";
import { SimulationContext } from "../../contexts/SimulationContext";
import useSubjectGroups from "../../hooks/useSubjectGroups";

const IntervalRow: FC<{
  header: string | JSX.Element;
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
  header: string | JSX.Element;
  values: string[];
};

const VariableTable: FC<{
  rowColumn: string;
  columns: string;
  rows: TableRow[];
}> = ({ rowColumn, columns, rows }) => {
  const { groups } = useSubjectGroups();
  const parameters = useParameters();
  const concentrationVariables = useConcentrationVariables();
  const { intervals } = useContext(SimulationContext);

  let columnHeadings = [] as (string | JSX.Element)[];
  if (columns === "parameters") {
    columnHeadings = parameters.map((parameter) => parameter.name);
  }
  if (columns === "variables") {
    columnHeadings = concentrationVariables.map((variable) => variable.name);
  }
  if (columns === "intervals") {
    columnHeadings = intervals.map(
      (interval) => `${interval.start} – ${interval.end}`,
    );
  }
  if (columns === "groups") {
    columnHeadings = groups
      ? [{ name: "Project" }, ...groups].map((group) => group.name)
      : [];
  }

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>{rowColumn}</TableCell>
          {columnHeadings.map((column, i) => (
            <TableCell key={i}>{column}</TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row, index) => (
          <IntervalRow key={index} {...row} />
        ))}
      </TableBody>
    </Table>
  );
};

export default VariableTable;
