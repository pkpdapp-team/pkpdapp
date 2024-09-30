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
  useProjectRetrieveQuery,
  useUnitListQuery,
} from "../../app/backendApi";
import { RootState } from "../../app/store";

type TimeInterval = {
  start: number;
  end: number;
  unit: string;
};

type TimeUnitSelectProps = {
  interval: TimeInterval;
  onChange: (interval: TimeInterval) => void;
};

function TimeUnitSelect({ interval, onChange }: TimeUnitSelectProps) {
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
  const timeUnits = hourUnit?.compatible_units.map((unit) => unit.symbol);
  const timeUnitOptions =
    timeUnits?.map((unit) => ({ value: unit, label: unit })) || [];

  function onChangeUnit(event: SelectChangeEvent) {
    onChange({ ...interval, unit: event.target.value });
  }

  return (
    <FormControl>
      <Select value={interval.unit} onChange={onChangeUnit}>
        {timeUnitOptions.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

type IntervalRowProps = {
  interval: TimeInterval;
  onDelete: () => void;
  onUpdate: (interval: TimeInterval) => void;
};

function IntervalRow({ interval, onDelete, onUpdate }: IntervalRowProps) {
  function onChangeStart(event: React.ChangeEvent<HTMLInputElement>) {
    onUpdate({ ...interval, start: parseFloat(event.target.value) });
  }
  function onChangeEnd(event: React.ChangeEvent<HTMLInputElement>) {
    onUpdate({ ...interval, end: parseFloat(event.target.value) });
  }

  return (
    <TableRow>
      <TableCell>
        <TextField
          type="number"
          value={interval.start}
          onChange={onChangeStart}
        />
      </TableCell>
      <TableCell>
        <TextField type="number" value={interval.end} onChange={onChangeEnd} />
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

const defaultIntervals: TimeInterval[] = [{ start: 0, end: 0, unit: "h" }];

const TimeIntervalsTable: FC<TableProps> = (props) => {
  const [intervals, setIntervals] = useState<TimeInterval[]>(defaultIntervals);

  function addInterval() {
    setIntervals([...intervals, { start: 0, end: 0, unit: "h" }]);
  }
  function removeInterval(index: number) {
    setIntervals(intervals.filter((_, i) => i !== index));
  }
  function updateInterval(index: number, interval: TimeInterval) {
    setIntervals(
      intervals.map((i, iIndex) => (iIndex === index ? interval : i)),
    );
  }
  const onDelete = (index: number) => () => removeInterval(index);
  const onUpdate = (index: number) => (interval: TimeInterval) =>
    updateInterval(index, interval);

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
          {intervals.map((interval, index) => (
            <IntervalRow
              key={`${interval.start}-${interval.end}-${interval.unit}`}
              interval={interval}
              onDelete={onDelete(index)}
              onUpdate={onUpdate(index)}
            />
          ))}
        </TableBody>
      </Table>
      <Button onClick={addInterval}>Add time interval</Button>
    </>
  );
};

export default TimeIntervalsTable;
