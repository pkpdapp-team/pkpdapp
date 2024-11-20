import { FC, useContext, useState } from "react";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
} from "@mui/material";

import { TimeInterval } from "../../App";
import { VariableRead } from "../../app/backendApi";
import useSubjectGroups from "../../hooks/useSubjectGroups";
import { SimulationContext } from "../../contexts/SimulationContext";

import { useConcentrationVariables } from "./useConcentrationVariables";
import { useParameters, Parameter } from "./useParameters";
import { ResultsTable } from "./ResultsTable";

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
  | TimeInterval[]
  | VariableRead[];

type Item =
  | { name: string }
  | Parameter
  | (TimeInterval & { name: string })
  | VariableRead;
type RowFilter = {
  filter: (event: SelectChangeEvent) => void;
  value: number;
  items: Item[];
  label: string;
};

const ResultsTab: FC = () => {
  const { groups = [] } = useSubjectGroups();
  const { intervals } = useContext(SimulationContext);
  const concentrationVariables = useConcentrationVariables();
  const parameters = useParameters();

  const [columns, setColumns] = useState("parameters");
  const [rows, setRows] = useState("variables");
  const [group, setGroup] = useState(0);
  const [variable, setVariable] = useState(0);
  const [interval, setInterval] = useState(0);
  const [parameter, setParameter] = useState(0);

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
          : [{ name: "Project" }, ...groups];
  const rowColumn =
    rows === "parameters"
      ? "Parameter"
      : rows === "variables"
        ? "Variable"
        : rows === "intervals"
          ? "Interval"
          : "Group";

  function handleRowsChange(event: SelectChangeEvent) {
    setRows(event.target.value);
  }
  function handleGroupChange(event: SelectChangeEvent) {
    const newValue = parseInt(event.target.value);
    setGroup(newValue);
  }
  function handleVariableChange(event: SelectChangeEvent) {
    const newValue = parseInt(event.target.value);
    setVariable(newValue);
  }
  function handleIntervalChange(event: SelectChangeEvent) {
    const newValue = parseInt(event.target.value);
    setInterval(newValue);
  }
  function handleParameterChange(event: SelectChangeEvent) {
    const newValue = parseInt(event.target.value);
    setParameter(newValue);
  }

  let rowFilter1: RowFilter | undefined;
  let rowFilter2: RowFilter | undefined;

  const groupSelect = {
    filter: handleGroupChange,
    value: group,
    items: [{ name: "Project" }, ...groups],
    label: "Group",
  };
  const intervalSelect = {
    filter: handleIntervalChange,
    value: interval,
    items: intervals.map((i) => ({ name: `${i.start} - ${i.end}`, ...i })),
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
        <FormControl size="small">
          <InputLabel id="columns-label">Columns</InputLabel>
          <Select
            value={columns}
            onChange={(event) => setColumns(event.target.value)}
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
        <FormControl size="small">
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
        <FormControl size="small">
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
        <FormControl size="small">
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
        <Typography variant="h5">{generateTableHeader()}</Typography>
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
  } catch (e: any) {
    console.error(e);
    return <div>Error {e.message}</div>;
  }
};

export default ResultsTab;