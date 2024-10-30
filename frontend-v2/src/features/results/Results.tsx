import { FC, useContext, useState } from "react";
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
} from "@mui/material";

import useSubjectGroups from "../../hooks/useSubjectGroups";
import IntervalRows from "./IntervalRows";
import VariableRows from "./VariableRows";
import GroupRows from "./GroupRows";
import { SimulationContext } from "../../contexts/SimulationContext";
import { useConcentrationVariables } from "./useConcentrationVariables";

const Results: FC = () => {
  const [rows, setRows] = useState("variables");
  const [group, setGroup] = useState(0);
  const [variable, setVariable] = useState(0);
  const [interval, setInterval] = useState(0);

  const { groups = [] } = useSubjectGroups();
  const { intervals } = useContext(SimulationContext);
  const concentrationVariables = useConcentrationVariables();

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

  let rowFilter1;
  let rowFilter2;

  if (rows === "variables") {
    rowFilter1 = {
      filter: handleGroupChange,
      value: group,
      items: [{ name: "Project" }, ...groups],
      label: "Group",
    };
    rowFilter2 = {
      filter: handleIntervalChange,
      value: interval,
      items: intervals.map((i) => ({ name: `${i.start} - ${i.end}`, ...i })),
      label: "Interval",
    };
  }
  if (rows === "intervals") {
    rowFilter1 = {
      filter: handleGroupChange,
      value: group,
      items: [{ name: "Project" }, ...groups],
      label: "Group",
    };
    rowFilter2 = {
      filter: handleVariableChange,
      value: variable,
      items: concentrationVariables,
      label: "Variable",
    };
  }
  if (rows === "groups") {
    rowFilter1 = {
      filter: handleVariableChange,
      value: variable,
      items: concentrationVariables,
      label: "Variable",
    };
    rowFilter2 = {
      filter: handleIntervalChange,
      value: interval,
      items: intervals.map((i) => ({ name: `${i.start} - ${i.end}`, ...i })),
      label: "Interval",
    };
  }

  try {
    return (
      <>
        <FormControl size="small">
          <InputLabel id="rows-label">Rows</InputLabel>
          <Select
            value={rows}
            onChange={handleRowsChange}
            label="Rows"
            labelId="rows-label"
          >
            <MenuItem value="variables">Variables</MenuItem>
            <MenuItem value="intervals">Intervals</MenuItem>
            <MenuItem value="groups">Groups</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small">
          <InputLabel id="filter1-label">{rowFilter1?.label}</InputLabel>
          <Select
            labelId="filter1-label"
            label={rowFilter1?.label}
            value={rowFilter1?.value.toString()}
            onChange={rowFilter1?.filter}
            aria-controls="cvar-tabpanel"
          >
            {rowFilter1?.items.map((item, index) => {
              return (
                <MenuItem key={item.name} value={index}>
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
            aria-controls="cvar-tabpanel"
          >
            {rowFilter2?.items.map((item, index) => {
              return (
                <MenuItem key={item.name} value={index}>
                  {item.name}
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
        <Box id="group-tabpanel">
          {rows === "intervals" && (
            <IntervalRows
              groupIndex={group}
              variableIndex={variable}
              rows={intervals}
            />
          )}
          {rows === "variables" && (
            <VariableRows
              groupIndex={group}
              intervalIndex={interval}
              rows={concentrationVariables}
            />
          )}
          {rows === "groups" && (
            <GroupRows
              variableIndex={variable}
              intervalIndex={interval}
              rows={[{ name: "Project" }, ...groups]}
            />
          )}
        </Box>
      </>
    );
  } catch (e: any) {
    console.error(e);
    return <div>Error {e.message}</div>;
  }
};

export default Results;
