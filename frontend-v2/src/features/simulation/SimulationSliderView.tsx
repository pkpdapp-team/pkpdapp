import {
  ChangeEvent,
  FC,
  SyntheticEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CombinedModelRead,
  SimulationSlider,
  UnitRead,
  VariableRead,
  useProjectRetrieveQuery,
  useVariableRetrieveQuery,
  useVariableUpdateMutation,
} from "../../app/backendApi";
import {
  Box,
  debounce,
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
import parameterDisplayName from "../model/parameters/parameterDisplayName";

interface SimulationSliderProps {
  index: number;
  slider: SimulationSlider;
  model: CombinedModelRead;
  getSliderValue: (variableId: number, variable?: VariableRead) => number;
  getSliderBounds: (variableId: number, variable?: VariableRead) => [number, number];
  onChange: (variable: number, value: number) => void;
  onWiden: (variableId: number) => void;
  onNarrow: (variableId: number) => void;
  onRemove: () => void;
  units: UnitRead[];
}

const SimulationSliderView: FC<SimulationSliderProps> = ({
  slider,
  getSliderValue,
  getSliderBounds,
  onChange,
  onWiden,
  onNarrow,
  model,
  onRemove,
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
  const [updateVariable] = useVariableUpdateMutation();

  const unit = units.find((u) => u.id === variable?.unit);

  const defaultValue =
    variable?.default_value !== undefined ? variable.default_value : 1.0;
  const value = getSliderValue(slider.variable, variable);
  const [minValue, maxValue] = getSliderBounds(slider.variable, variable);
  const [draftValue, setDraftValue] = useState<number>(value);
  const [editing, setEditing] = useState<boolean>(false);
  const debouncedOnChange = useMemo(() => debounce(onChange, 300), [onChange]);

  useEffect(() => {
    return () => {
      debouncedOnChange.clear();
    };
  }, [debouncedOnChange]);

  useEffect(() => {
    if (!editing) {
      setDraftValue(value);
    }
  }, [editing, value]);

  const handleSliderChange = (
    event: Event | SyntheticEvent<Element, Event>,
    newValue: number | number[],
  ) => {
    if (typeof newValue === "number") {
      setDraftValue(newValue);
    }
  };

  const handleReset = () => {
    onChange(slider.variable, defaultValue);
    setDraftValue(defaultValue);
  };

  const handleSave = () => {
    if (!variable) {
      return;
    }
    updateVariable({
      id: slider.variable,
      variable: {
        ...variable,
        default_value: value,
      },
    });
  };

  const handleDelete = () => {
    onRemove();
  };

  const handleWider = () => {
    onWiden(slider.variable);
  };

  const handleNarrow = () => {
    onNarrow(slider.variable);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setEditing(true);
    setDraftValue(Number(event.target.value));
  };

  const stepValue = (maxValue - minValue) / 1000.0;

  const commitChanges = () => {
    commitChangesWithValue(new Event("commit"), draftValue);
  };

  const commitChangesWithValue = (
    _event: React.SyntheticEvent | Event,
    value: number | number[],
  ) => {
    // value should always be a number
    if (typeof value !== "number") {
      return;
    }
    setEditing(false);
    let truncatedValue = value;
    if (value < minValue) {
      truncatedValue = minValue;
    } else if (value > maxValue) {
      truncatedValue = maxValue;
    }
    setDraftValue(truncatedValue);
    debouncedOnChange(slider.variable, truncatedValue);
  };

  const formatNumber = (value: number) => {
    if (editing) {
      return value;
    }
    if (value === 0.0) {
      return value.toFixed(3);
    } else if (value < 0.001) {
      return value.toExponential(3);
    } else if (value > 1000) {
      return value.toExponential(3);
    }
    return value.toFixed(3);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!variable) {
    return <div>Variable not found</div>;
  }

  const variable_name = parameterDisplayName(variable, model);

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
        <Tooltip title={variable.description} placement="bottom" describeChild>
          <Typography
            id="discrete-slider"
            gutterBottom
            sx={{ flexGrow: 1, fontWeight: "bold" }}
          >
            {unit?.symbol
              ? `${variable_name} [${unit?.symbol}]`
              : variable_name}
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
          value={typeof draftValue === "number" ? draftValue : 0}
          min={minValue}
          max={maxValue}
          step={stepValue}
          shiftStep={stepValue * 10}
          onChange={handleSliderChange}
          onChangeCommitted={commitChangesWithValue}
          valueLabelDisplay="off"
          aria-labelledby="discrete-slider"
        />
      </Box>
      <Box alignItems="center">
        <Input
          sx={{ width: "100%" }}
          value={formatNumber(draftValue)}
          size="small"
          onChange={handleInputChange}
          onBlur={commitChanges}
          inputProps={{
            step: stepValue,
            min: minValue,
            max: maxValue,
            type: "number",
            "aria-labelledby": "discrete-slider",
          }}
        />
      </Box>
    </div>
  );
};

export default SimulationSliderView;
