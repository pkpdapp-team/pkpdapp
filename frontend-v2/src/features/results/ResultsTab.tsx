import { FC, useState } from "react";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
} from "@mui/material";

import {
  ColumnsEnum,
  ResultsTableRead,
  RowsEnum,
  TimeIntervalRead,
  VariableRead,
} from "../../app/backendApi";
import useSubjectGroups from "../../hooks/useSubjectGroups";

import { useConcentrationVariables } from "./useConcentrationVariables";
import { useParameters, Parameter } from "./useParameters";
import { ResultsTable } from "./ResultsTable";
import { useModelTimeIntervals } from "../../hooks/useModelTimeIntervals";
import { useResults } from "./useResults";

const options = [
  { name: "Parameters", value: "parameters" },
  { name: "Variables", value: "variables" },
  { name: "Intervals", value: "intervals" },
  { name: "Groups", value: "groups" },
];

export type FilterIndex = number | "rows" | "columns";
export type RowData =
  | { name: string }[]
  | Parameter[]
  | TimeIntervalRead[]
  | VariableRead[];

type Item =
  | { name: string }
  | Parameter
  | (TimeIntervalRead & { name: string })
  | VariableRead;
type RowFilter = {
  filter: (event: SelectChangeEvent) => void;
  value: number;
  items: Item[];
  label: string;
};

const ResultsTab: FC<{ table: ResultsTableRead }> = ({ table }) => {
  const { groups = [] } = useSubjectGroups();
  const [intervals] = useModelTimeIntervals();
  const concentrationVariables = useConcentrationVariables();
  const parameters = useParameters();

  const [columns, setColumns] = useState(table.columns);
  const [rows, setRows] = useState(table.rows);
  const [group, setGroup] = useState(parseInt(table.filters?.groupIndex) || 0);
  const [variable, setVariable] = useState(
    parseInt(table.filters?.variableIndex) || 0,
  );
  const [interval, setInterval] = useState(
    parseInt(table.filters?.intervalIndex) || 0,
  );
  const [parameter, setParameter] = useState(
    parseInt(table.filters?.parameterIndex) || 0,
  );
  const { updateResults } = useResults();

  const loaded =
    (intervals.length && concentrationVariables.length && parameters.length) >
    0;
  if (!loaded) {
    return <div>Loading...</div>;
  }

  const groupIndex: FilterIndex =
    columns === "groups" ? "columns" : rows === "groups" ? "rows" : group;
  const variableIndex: FilterIndex =
    columns === "variables"
      ? "columns"
      : rows === "variables"
        ? "rows"
        : variable;
  const intervalIndex: FilterIndex =
    columns === "intervals"
      ? "columns"
      : rows === "intervals"
        ? "rows"
        : interval;
  const parameterIndex: FilterIndex =
    columns === "parameters"
      ? "columns"
      : rows === "parameters"
        ? "rows"
        : parameter;

  const rowData: RowData =
    rows === "parameters"
      ? parameters
      : rows === "variables"
        ? concentrationVariables
        : rows === "intervals"
          ? intervals
          : [{ name: "Sim-Group 1" }, ...groups];
  const rowColumn =
    rows === "parameters"
      ? "Parameter"
      : rows === "variables"
        ? "Variable"
        : rows === "intervals"
          ? "Interval"
          : "Group";

  function getFilters() {
    return { groupIndex, variableIndex, intervalIndex, parameterIndex };
  }
  function handleColumnsChange(event: SelectChangeEvent) {
    const newColumns = event.target.value as ColumnsEnum;
    setColumns(newColumns);
    updateResults({
      id: table.id,
      resultsTable: {
        ...table,
        columns: newColumns,
        rows,
        filters: getFilters(),
      },
    });
  }

  function handleRowsChange(event: SelectChangeEvent) {
    const newRows = event.target.value as RowsEnum;
    setRows(newRows);
    updateResults({
      id: table.id,
      resultsTable: { ...table, columns, rows: newRows, filters: getFilters() },
    });
  }
  function handleGroupChange(event: SelectChangeEvent) {
    const newValue = parseInt(event.target.value);
    setGroup(newValue);

    updateResults({
      id: table.id,
      resultsTable: {
        ...table,
        columns,
        rows,
        filters: { ...getFilters(), groupIndex: event.target.value },
      },
    });
  }
  function handleVariableChange(event: SelectChangeEvent) {
    const newValue = parseInt(event.target.value);
    setVariable(newValue);
    updateResults({
      id: table.id,
      resultsTable: {
        ...table,
        columns,
        rows,
        filters: { ...getFilters(), variableIndex: event.target.value },
      },
    });
  }
  function handleIntervalChange(event: SelectChangeEvent) {
    const newValue = parseInt(event.target.value);
    setInterval(newValue);
    updateResults({
      id: table.id,
      resultsTable: {
        ...table,
        columns,
        rows,
        filters: { ...getFilters(), intervalIndex: event.target.value },
      },
    });
  }
  function handleParameterChange(event: SelectChangeEvent) {
    const newValue = parseInt(event.target.value);
    setParameter(newValue);
    updateResults({
      id: table.id,
      resultsTable: {
        ...table,
        columns,
        rows,
        filters: { ...getFilters(), parameterIndex: event.target.value },
      },
    });
  }

  let rowFilter1: RowFilter | undefined;
  let rowFilter2: RowFilter | undefined;

  const groupSelect = {
    filter: handleGroupChange,
    value: group,
    items: [{ name: "Sim-Group 1" }, ...groups],
    label: "Group",
  };
  const intervalSelect = {
    filter: handleIntervalChange,
    value: interval,
    items: intervals.map((i) => ({
      name: `${i.start_time} - ${i.end_time}`,
      ...i,
    })),
    label: "Interval",
  };
  const variableSelect = {
    filter: handleVariableChange,
    value: variable,
    items: concentrationVariables,
    label: "Variable",
  };
  const parameterSelect = {
    filter: handleParameterChange,
    value: parameter,
    items: parameters,
    label: "Parameter",
  };

  if (rows === "variables") {
    rowFilter1 = columns === "groups" ? parameterSelect : groupSelect;
    rowFilter2 = columns === "intervals" ? parameterSelect : intervalSelect;
  }
  if (rows === "intervals") {
    rowFilter1 = columns === "groups" ? parameterSelect : groupSelect;
    rowFilter2 = columns === "variables" ? parameterSelect : variableSelect;
  }
  if (rows === "groups") {
    rowFilter1 = columns === "variables" ? parameterSelect : variableSelect;
    rowFilter2 = columns === "intervals" ? parameterSelect : intervalSelect;
  }
  if (rows === "parameters") {
    rowFilter1 = columns === "groups" ? variableSelect : groupSelect;
    rowFilter2 = columns === "intervals" ? variableSelect : intervalSelect;
  }

  const generateTableHeader = () => {
    if (rows === "parameters" || columns === "parameters") {
      const var1 = rows === "parameters" ? columns : rows;

      return (
        <div>
          All Secondary PK parameters of all selected {var1} of{" "}
          {rowFilter1?.label?.toLowerCase()} &apos;
          {rowFilter1?.items?.[rowFilter1?.value]?.name}&apos; and{" "}
          {rowFilter2?.label.toLowerCase()} &apos;
          {rowFilter2?.items?.[rowFilter2?.value]?.name}&apos;
        </div>
      );
    }

    const var1 =
      rowFilter1?.label === "Parameter"
        ? rowFilter1?.items?.[rowFilter1?.value]?.name
        : rowFilter2?.items?.[rowFilter2?.value]?.name;
    const var2 =
      rowFilter1?.label === "Parameter" ? rowFilter2?.label : rowFilter1?.label;
    const var3 =
      rowFilter1?.label === "Parameter"
        ? rowFilter2?.items?.[rowFilter2?.value]?.name
        : rowFilter1?.items?.[rowFilter1?.value]?.name;

    const desc1 = () => {
      if (var2 === "Interval") return "and time interval";
      if (var2 === "Group") return "of group";
      if (var2 === "Variable") return "for variable";
    };

    return (
      <div>
        Secondary PK Parameter ({var1}) of all {columns} for all {rows}{" "}
        {desc1()} &apos;{var3}&apos;
      </div>
    );
  };

  try {
    return (
      <>
        <FormControl size="small" sx={{ marginTop: ".5rem" }}>
          <InputLabel id="columns-label">Columns</InputLabel>
          <Select
            value={columns}
            onChange={handleColumnsChange}
            label="Columns"
            labelId="columns-label"
            sx={{ minWidth: "10rem", marginRight: "1rem" }}
          >
            {options
              .filter((option) => option.value !== rows)
              .map((option) => {
                return (
                  <MenuItem key={option.name} value={option.value}>
                    {option.name}
                  </MenuItem>
                );
              })}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ marginTop: ".5rem" }}>
          <InputLabel id="rows-label">Rows</InputLabel>
          <Select
            value={rows}
            onChange={handleRowsChange}
            label="Rows"
            labelId="rows-label"
            sx={{ minWidth: "10rem", marginRight: "1rem" }}
          >
            {options
              .filter((option) => option.value !== columns)
              .map((option) => {
                return (
                  <MenuItem key={option.name} value={option.value}>
                    {option.name}
                  </MenuItem>
                );
              })}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ marginTop: ".5rem" }}>
          <InputLabel id="filter1-label">{rowFilter1?.label}</InputLabel>
          <Select
            labelId="filter1-label"
            label={rowFilter1?.label}
            value={rowFilter1?.value.toString()}
            onChange={rowFilter1?.filter}
            sx={{ minWidth: "10rem", marginRight: "1rem" }}
          >
            {rowFilter1?.items.map((item, index) => {
              return (
                <MenuItem key={item.name.toString()} value={index}>
                  {item.name}
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ marginTop: ".5rem" }}>
          <InputLabel id="filter2-label">{rowFilter2?.label}</InputLabel>
          <Select
            labelId="filter2-label"
            label={rowFilter2?.label}
            value={rowFilter2?.value.toString()}
            onChange={rowFilter2?.filter}
            sx={{ minWidth: "10rem" }}
          >
            {rowFilter2?.items.map((item, index) => {
              return (
                <MenuItem key={item.name.toString()} value={index}>
                  {item.name}
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
        <Typography
          sx={{ paddingTop: ".5rem", paddingBottom: ".5rem" }}
          variant="h5"
        >
          {generateTableHeader()}
        </Typography>
        <ResultsTable
          groupIndex={groupIndex}
          variableIndex={variableIndex}
          parameterIndex={parameterIndex}
          intervalIndex={intervalIndex}
          rows={rowData}
          rowColumn={rowColumn}
        />
      </>
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    console.error(e);
    return <div>Error {e.message}</div>;
  }
};

export default ResultsTab;
