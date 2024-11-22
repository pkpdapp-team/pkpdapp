import { ChangeEvent, FC, SyntheticEvent, useEffect, useState } from "react";
import {
  SimulationSlider,
  UnitRead,
  useProjectRetrieveQuery,
  useVariableRetrieveQuery,
} from "../../app/backendApi";
import {
  Box,
  Grid,
  IconButton,
  Input,
  Slider,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import CloseFullscreen from "@mui/icons-material/CloseFullscreen";
import Delete from "@mui/icons-material/Delete";
import OpenInFull from "@mui/icons-material/OpenInFull";
import Replay from "@mui/icons-material/Replay";
import Save from "@mui/icons-material/Save";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { selectIsProjectShared } from "../login/loginSlice";

interface SimulationSliderProps {
  index: number;
  slider: SimulationSlider;
  onChange: (variable: number, value: number) => void;
  onSave: (value: number) => void;
  onRemove: () => void;
  units: UnitRead[];
}

const SimulationSliderView: FC<SimulationSliderProps> = ({
  slider,
  onChange,
  onRemove,
  onSave,
  units,
}) => {
  const projectId = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const { data: project } = useProjectRetrieveQuery(
    { id: projectId || 0 },
    { skip: !projectId },
  );
  const isSharedWithMe = useSelector((state: RootState) =>
    selectIsProjectShared(state, project),
  );

  const { data: variable, isLoading } = useVariableRetrieveQuery({
    id: slider.variable,
  });

  const unit = units.find((u) => u.id === variable?.unit);

  const [range, setRange] = useState<number>(10.0);

  // update the slider value if the variable default value changes
  const defaultValue = variable?.default_value || 1.0;
  const [value, setValue] = useState<number>(defaultValue);
  useEffect(() => {
    // don't set the value of the slider until the variable is loaded
    if (variable) {
      setValue(defaultValue);
      onChange(slider.variable, defaultValue);
    }
  }, [onChange, defaultValue, variable]);

  const handleSliderChange = (
    event: Event | SyntheticEvent<Element, Event>,
    newValue: number | number[],
  ) => {
    if (typeof newValue === "number") {
      setValue(newValue);
    }
  };

  const handleReset = () => {
    if (variable) {
      setValue(defaultValue);
      onChange(slider.variable, defaultValue);
    }
  };

  const handleSave = () => {
    setValue(value);
    onSave(value);
  };

  const handleDelete = () => {
    onRemove();
  };

  const handleWider = () => {
    setRange(range + 10.0);
  };

  const handleNarrow = () => {
    setRange(Math.max(range - 10.0, 10.0));
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setValue(Number(event.target.value));
  };

  const baseValue = variable?.default_value || 1.0;
  const minValue = Math.max(
    variable?.lower_bound || -Infinity,
    baseValue / range,
  );
  const maxValue = Math.min(
    variable?.upper_bound || Infinity,
    baseValue * range,
  );
  const stepValue = (maxValue - minValue) / 1000.0;

  const handleBlur = () => {
    let truncatedValue = value;
    if (value < minValue) {
      setValue(minValue);
      truncatedValue = minValue;
    } else if (value > maxValue) {
      setValue(maxValue);
      truncatedValue = maxValue;
    }
    onChange(slider.variable, truncatedValue);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!variable) {
    return <div>Variable not found</div>;
  }

  return (
    <div
      data-cy={`parameter-slider-${variable.name}`}
      style={{
        backgroundColor: "#f5f5f2",
        width: "12rem",
        padding: ".5rem",
        border: "1px solid #DBD7D3",
        marginTop: ".5rem",
        borderRadius: "5px",
      }}
    >
      <Stack direction="row" spacing={0} alignItems="center">
        <Tooltip title={variable.description} placement="bottom">
          <Typography
            id="discrete-slider"
            gutterBottom
            sx={{ flexGrow: 1, fontWeight: "bold" }}
          >
            {unit?.symbol
              ? `${variable.name} [${unit?.symbol}]`
              : variable.name}
          </Typography>
        </Tooltip>
      </Stack>
      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Tooltip title={"Reset to saved default value"} placement="top">
          <IconButton
            aria-label="reset"
            onClick={handleReset}
            sx={{ padding: "2px" }}
          >
            <Replay fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={"Save value to parameters"} placement="top">
          <IconButton
            aria-label="save"
            onClick={handleSave}
            disabled={isSharedWithMe}
            sx={{ padding: "2px" }}
          >
            <Save fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={"Widen range"} placement="top">
          <IconButton
            aria-label="widen"
            onClick={handleWider}
            sx={{ padding: "2px" }}
          >
            <OpenInFull fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={"Narrow range"} placement="top">
          <IconButton
            aria-label="restrict"
            onClick={handleNarrow}
            sx={{ padding: "2px" }}
          >
            <CloseFullscreen fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={"Remove slider"} placement="top">
          <IconButton
            aria-label="delete"
            onClick={handleDelete}
            disabled={isSharedWithMe}
            sx={{ padding: "2px" }}
          >
            <Delete fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <Box alignItems="center">
          <Slider
            value={typeof value === "number" ? value : 0}
            min={minValue}
            max={maxValue}
            step={stepValue}
            onChange={handleSliderChange}
            onChangeCommitted={handleBlur}
            valueLabelDisplay="off"
            aria-labelledby="input-slider"
          />
      </Box>
      <Box alignItems="center">
          <Input
          sx={{ width: '100%'}}
            value={value}
            size="small"
            onChange={handleInputChange}
            onBlur={handleBlur}
            inputProps={{
              step: stepValue,
              min: minValue,
              max: maxValue,
              type: "number",
              "aria-labelledby": "input-slider",
            }}
          />
      </Box>
    </div>
  );
};

export default SimulationSliderView;
