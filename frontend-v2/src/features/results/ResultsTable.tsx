import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { FC } from "react";

import useSubjectGroups from "../../hooks/useSubjectGroups";

import { useParameterNames } from "./useParameters";
import { useConcentrationVariables } from "./useConcentrationVariables";

import { FilterIndex, RowData } from "./ResultsTab";
import { useTableRows } from "./useTableRows";
import { getTableHeight } from "../../shared/calculateTableHeights";
import { useModelTimeIntervals } from "../../hooks/useModelTimeIntervals";

const RESULTS_TABLE_HEIGHTS = [
  {
    minHeight: 1100,
    tableHeight: "70vh",
  },
  {
    minHeight: 1000,
    tableHeight: "65vh",
  },
  {
    minHeight: 900,
    tableHeight: "60vh",
  },
  {
    minHeight: 800,
    tableHeight: "58vh",
  },
  {
    minHeight: 700,
    tableHeight: "53vh",
  },
  {
    minHeight: 600,
    tableHeight: "40vh",
  },
  {
    minHeight: 500,
    tableHeight: "40vh",
  },
];

const IntervalRow: FC<{
  header: string | JSX.Element;
  values: string[];
}> = ({ header, values }) => {
  return (
    <TableRow>
      <TableCell sx={{ textWrap: "nowrap" }} scope="row">
        {header}
      </TableCell>
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
  const parameterNames = useParameterNames();
  const concentrationVariables = useConcentrationVariables();
  const [intervals] = useModelTimeIntervals();
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
        ? parameterNames
        : variableIndex === "columns"
          ? concentrationVariables.map((variable) => variable.name)
          : intervalIndex === "columns"
            ? intervals.map(
              (interval) => `${interval.start_time} – ${interval.end_time}`,
            )
            : groupIndex === "columns"
              ? groups
                ? [{ name: "Sim-Group 1" }, ...groups].map((group) => group.name)
                : []
              : [];

    return (
      <TableContainer
        sx={{
          width: "fit-content",
          maxWidth: "100%",
          maxHeight: getTableHeight({ steps: RESULTS_TABLE_HEIGHTS }),
        }}
        tabIndex={0}
      >
        <Table stickyHeader size="small" aria-label="Results table">
          <TableHead>
            <TableRow>
              <TableCell>{rowColumn}</TableCell>
              {columnHeadings.map((column, i) => (
                <TableCell sx={{ textWrap: "nowrap" }} key={i}>
                  {column}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {tableRows.map((row, index) => (
              <IntervalRow key={index} {...row} />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    console.error(e);
    return <div>Error {e.message}</div>;
  }
};
