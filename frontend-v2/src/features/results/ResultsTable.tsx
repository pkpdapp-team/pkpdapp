import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import { FC, useContext } from "react";

import { TimeInterval } from "../../App";
import { VariableRead } from "../../app/backendApi";
import { SimulationContext } from "../../contexts/SimulationContext";
import useSubjectGroups from "../../hooks/useSubjectGroups";

import { useParameters } from "./useParameters";
import { useConcentrationVariables } from "./useConcentrationVariables";

import { useTableRows } from "./useTableRows";
import { Parameter } from "./useParameters";

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

interface ResultsTableProps {
  groupIndex?: number;
  intervalIndex?: number;
  variableIndex?: number;
  parameterIndex?: number;
  columns: string;
  rows: { name: string }[] | Parameter[] | TimeInterval[] | VariableRead[];
  rowColumn: string;
}

export const ResultsTable: FC<ResultsTableProps> = ({
  groupIndex,
  intervalIndex,
  variableIndex,
  parameterIndex,
  columns = "",
  rows = [],
  rowColumn = "",
}) => {
  const { groups } = useSubjectGroups();
  const parameters = useParameters();
  const concentrationVariables = useConcentrationVariables();
  const { intervals } = useContext(SimulationContext);
  const tableRows = useTableRows({
    rows,
    groupIndex,
    intervalIndex,
    variableIndex,
    parameterIndex,
  });

  if (!rows[0]) {
    return <p>Loading…</p>;
  }

  try {
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
          {tableRows.map((row, index) => (
            <IntervalRow key={index} {...row} />
          ))}
        </TableBody>
      </Table>
    );
  } catch (e: any) {
    console.error(e);
    return <div>Error {e.message}</div>;
  }
};
