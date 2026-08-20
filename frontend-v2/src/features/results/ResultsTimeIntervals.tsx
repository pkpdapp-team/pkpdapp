import { FC, useRef, useState } from "react";
import {
  Box,
  Button,
  FormControl,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddCircleOutlineOutlinedIcon from "@mui/icons-material/AddCircleOutlineOutlined";
import Delete from "@mui/icons-material/Delete";
import { useModelTimeIntervals } from "../../hooks/useModelTimeIntervals";
import { useUnits } from "./useUnits";

const ResultsTimeIntervals: FC = () => {
  const [intervals, setIntervals] = useModelTimeIntervals();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const intervalsRef = useRef(intervals);
  const updateTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  intervalsRef.current = intervals;
  const units = useUnits();
  const timeUnits =
    units.find((unit) => unit.symbol === "h")?.compatible_units || [];
  const currentUnit = intervals[0]?.unit || timeUnits[0]?.id || "";

  const addInterval = () => {
    const last = intervals[intervals.length - 1];
    const duration = last ? last.end_time - last.start_time : 24;
    const start = last?.end_time || 0;
    setIntervals([
      ...intervals,
      { start_time: start, end_time: start + duration, unit: +currentUnit },
    ]);
  };

  const commitInterval = (
    index: number,
    field: "start_time" | "end_time",
    value: string,
  ) => {
    const parsedValue = value === "" ? 0 : parseFloat(value);
    if (!Number.isFinite(parsedValue)) return;
    setIntervals(
      intervals.map((interval, i) =>
        i === index ? { ...interval, [field]: parsedValue } : interval,
      ),
    );
  };

  const updateDraft = (index: number, field: "start_time" | "end_time", value: string) =>
    setDrafts((current) => ({ ...current, [`${index}.${field}`]: value }));

  const scheduleUpdate = (
    index: number,
    field: "start_time" | "end_time",
    value: string,
  ) => {
    updateDraft(index, field, value);
    const key = `${index}.${field}`;
    clearTimeout(updateTimers.current[key]);
    updateTimers.current[key] = setTimeout(() => {
      const parsedValue = value === "" ? 0 : parseFloat(value);
      if (!Number.isFinite(parsedValue)) return;
      setIntervals(
        intervalsRef.current.map((interval, i) =>
          i === index ? { ...interval, [field]: parsedValue } : interval,
        ),
      );
    }, 350);
  };

  const valueFor = (index: number, field: "start_time" | "end_time", value: number) =>
    drafts[`${index}.${field}`] ?? String(value);

  const removeInterval = (index: number) =>
    setIntervals(intervals.filter((_, i) => i !== index));

  const updateUnit = (unit: string) => {
    const parsedUnit = parseInt(unit, 10);
    if (!Number.isFinite(parsedUnit)) return;
    setIntervals(
      intervals.map((interval) => ({ ...interval, unit: parsedUnit })),
    );
  };

  return (
    <Stack spacing={1} sx={{ width: "100%" }}>
      <Button
        size="small"
        variant="contained"
        startIcon={<AddCircleOutlineOutlinedIcon />}
        onClick={addInterval}
      >
        Add New Interval
      </Button>
      {intervals.map((interval, index) => (
        <Box
          component="fieldset"
          key={interval.id ?? index}
          sx={{ border: 0, borderBottom: "1px solid #dbd6d1", p: 0, pb: 1 }}
        >
          <Typography
            component="legend"
            sx={{
              fontSize: "1rem",
              fontWeight: 500,
              lineHeight: 1.5,
              px: 0.5,
              mb: 0.5,
            }}
          >
            Interval {index + 1}
          </Typography>
          <Stack spacing={0.5}>
            <TextField
              size="small"
              type="number"
              label="Start time"
              value={valueFor(index, "start_time", interval.start_time)}
              onChange={(event) =>
                scheduleUpdate(index, "start_time", event.target.value)
              }
              onBlur={() => commitInterval(index, "start_time", drafts[`${index}.start_time`] ?? String(interval.start_time))}
            />
            <TextField
              size="small"
              type="number"
              label="End time"
              value={valueFor(index, "end_time", interval.end_time)}
              onChange={(event) =>
                scheduleUpdate(index, "end_time", event.target.value)
              }
              onBlur={() => commitInterval(index, "end_time", drafts[`${index}.end_time`] ?? String(interval.end_time))}
            />
            {index === 0 && (
              <FormControl size="small">
                <Select
                  value={String(currentUnit)}
                  onChange={(event) => updateUnit(event.target.value)}
                  aria-label="Time unit"
                >
                  {timeUnits.map((unit) => (
                    <MenuItem key={unit.id} value={unit.id}>
                      {unit.symbol}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <IconButton
              aria-label="Delete time interval"
              onClick={() => removeInterval(index)}
            >
              <Delete />
            </IconButton>
          </Stack>
        </Box>
      ))}
    </Stack>
  );
};

export default ResultsTimeIntervals;
