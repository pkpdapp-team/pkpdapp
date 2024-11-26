import { FC, useState } from "react";
import {
  Button,
  FormControl,
  IconButton,
  MenuItem,
  Select,
  SelectChangeEvent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableProps,
  TableRow,
  TextField,
} from "@mui/material";
import Delete from "@mui/icons-material/Delete";
import { useSelector } from "react-redux";

import {
  TimeIntervalRead,
  useProjectRetrieveQuery,
  useUnitListQuery,
} from "../../../app/backendApi";
import { RootState } from "../../../app/store";
import { useModelTimeIntervals } from "../../../hooks/useModelTimeIntervals";

type TimeUnitSelectProps = {
  interval: TimeIntervalRead;
  onChange: (interval: TimeIntervalRead) => void;
};

function useTimeUnits() {
  const projectId = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const { data: project } = useProjectRetrieveQuery(
    { id: projectId || 0 },
    { skip: !projectId },
  );
  const { data: units } = useUnitListQuery(
    { compoundId: project?.compound },
    { skip: !project || !project.compound },
  );
  const hourUnit = units?.find((unit) => unit.symbol === "h");
  return hourUnit?.compatible_units || [];
}

function TimeUnitSelect({ interval, onChange }: TimeUnitSelectProps) {
  const defaultTimeUnit = 9; // set hours by default
  const [selectedUnit, setSelectedUnit] = useState(
    interval.unit || defaultTimeUnit,
  );
  const timeUnits = useTimeUnits();
  const timeUnitOptions =
    timeUnits?.map((unit) => ({ value: unit.id, label: unit.symbol })) || [];

  function onChangeUnit(event: SelectChangeEvent) {
    const unit = timeUnits?.find((unit) => unit.id === event.target.value);
    if (unit) {
      setSelectedUnit(+unit.id);
      onChange({ ...interval, unit: +unit.id });
    }
  }

  return (
    <FormControl>
      <Select value={selectedUnit.toString()} onChange={onChangeUnit}>
        {timeUnitOptions.map((option) => (
          <MenuItem key={option.label} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

type IntervalRowProps = {
  interval: TimeIntervalRead;
  onDelete: () => void;
  onUpdate: (interval: TimeIntervalRead) => void;
};

function IntervalRow({ interval, onDelete, onUpdate }: IntervalRowProps) {
  const [start, setStart] = useState(interval.start_time);
  const [end, setEnd] = useState(interval.end_time);
  function onChangeStart(event: React.ChangeEvent<HTMLInputElement>) {
    const newStartTime = parseFloat(event.target.value);
    setStart(newStartTime);
    onUpdate({ ...interval, start_time: newStartTime });
  }
  function onChangeEnd(event: React.ChangeEvent<HTMLInputElement>) {
    const newEndTime = parseFloat(event.target.value);
    setEnd(newEndTime);
    onUpdate({ ...interval, end_time: newEndTime });
  }

  return (
    <TableRow>
      <TableCell>
        <TextField type="number" value={start} onChange={onChangeStart} />
      </TableCell>
      <TableCell>
        <TextField type="number" value={end} onChange={onChangeEnd} />
      </TableCell>
      <TableCell>
        <TimeUnitSelect interval={interval} onChange={onUpdate} />
      </TableCell>
      <TableCell>
        <IconButton onClick={onDelete}>
          <Delete />
        </IconButton>
      </TableCell>
    </TableRow>
  );
}

const TimeIntervalsTable: FC<TableProps> = (props) => {
  const [intervals, setIntervals] = useModelTimeIntervals();
  const timeUnits = useTimeUnits();
  const hourUnit = timeUnits?.find((unit) => unit.symbol === "h");

  function addInterval() {
    const lastInterval = intervals[intervals.length - 1];
    if (hourUnit) {
      let newInterval = {
        start_time: 0,
        end_time: 0,
        unit: +hourUnit.id,
      };
      if (lastInterval) {
        const duration = lastInterval.end_time - lastInterval.start_time;
        newInterval = {
          start_time: lastInterval.end_time,
          end_time: lastInterval.end_time + duration,
          unit: lastInterval.unit,
        };
      }
      setIntervals([...intervals, newInterval]);
    }
  }
  function removeInterval(id: number) {
    const newIntervals = intervals.filter((i) => i.id !== id);
    setIntervals(newIntervals);
  }
  function updateInterval(id: number, interval: TimeIntervalRead) {
    setIntervals(intervals.map((i) => (i.id === id ? interval : i)));
  }
  const onDelete = (id: number) => () => removeInterval(id);
  const onUpdate = (id: number) => (interval: TimeIntervalRead) =>
    updateInterval(id, interval);

  return (
    <>
      <Table {...props}>
        <TableHead>
          <TableCell>Start time</TableCell>
          <TableCell>End time</TableCell>
          <TableCell>Unit</TableCell>
          <TableCell>Remove</TableCell>
        </TableHead>
        <TableBody>
          {intervals.map((interval) => (
            <IntervalRow
              key={interval.start_time}
              interval={interval}
              onDelete={onDelete(interval.id)}
              onUpdate={onUpdate(interval.id)}
            />
          ))}
        </TableBody>
      </Table>
      <Button onClick={addInterval}>Add time interval</Button>
    </>
  );
};

export default TimeIntervalsTable;
