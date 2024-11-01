import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import { FC, useContext } from "react";

import { SimulationContext } from "../../contexts/SimulationContext";
import useSubjectGroups from "../../hooks/useSubjectGroups";

import { useParameters } from "./useParameters";
import { useConcentrationVariables } from "./useConcentrationVariables";

import { FilterIndex, RowData } from "./ResultsTab";
import { useTableRows } from "./useTableRows";

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
  groupIndex: FilterIndex;
  intervalIndex: FilterIndex;
  variableIndex: FilterIndex;
  parameterIndex: FilterIndex;
  rows: RowData;
  rowColumn: string;
}

/**
 * A table of results where each cell represents a given group, interval, variable, and parameter.
 * One of the index props should be "rows" and another should be "columns". The rest should be set
 * to the index of the item to display in each table cell.
 * @param groupIndex "rows" or "columns" or the index of the group to display in the table.
 * @param intervalIndex "rows" or "columns" or the index of the interval to display in the table.
 * @param variableIndex "rows" or "columns" or the index of the variable to display in the table.
 * @param parameterIndex "rows" or "columns" or the index of the parameter to display in the table.
 * @param rows an array of row data.
 * @param rowColumn The name of the row column.
 */
export const ResultsTable: FC<ResultsTableProps> = ({
  groupIndex,
  intervalIndex,
  variableIndex,
  parameterIndex,
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
    const columnHeadings =
      parameterIndex === "columns"
        ? parameters.map((parameter) => parameter.name)
        : variableIndex === "columns"
          ? concentrationVariables.map((variable) => variable.name)
          : intervalIndex === "columns"
            ? intervals.map((interval) => `${interval.start} – ${interval.end}`)
            : groupIndex === "columns"
              ? groups
                ? [{ name: "Project" }, ...groups].map((group) => group.name)
                : []
              : [];

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
