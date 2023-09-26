import React, { SyntheticEvent, useEffect } from 'react';
import { SimulationSlider, Unit, useVariableRetrieveQuery } from '../../app/backendApi';
import { Grid, IconButton, Input, Slider, Stack, Tooltip, Typography } from '@mui/material';
import { CloseFullscreen, Delete, OpenInFull, Replay, Save } from '@mui/icons-material';

interface SimulationSliderProps {
  index: number;
  slider: SimulationSlider;
  onChange: (value: number) => void;
  onSave: (value: number) => void;
  remove: (index: number) => void;
  units: Unit[];
}

const SimulationSliderView: React.FC<SimulationSliderProps> = ({ index, slider, onChange, remove, onSave, units }) => {
  const { data: variable, isLoading } = useVariableRetrieveQuery({id: slider.variable});

  const unit = units.find((unit) => unit.id === variable?.unit);

  const [value, setValue] = React.useState<number>(
    variable?.default_value || 1.0,
  );

  const [ range, setRange ] = React.useState<number>(10.0);


  useEffect(() => {
    setValue(variable?.default_value || 1.0);
  }, [variable]);

  const handleSliderChange = (event: Event | SyntheticEvent<Element, Event>, newValue: number | number[]) => {
    if (typeof newValue === 'number') {
      setValue(newValue);
    }
  };

  const handleReset = () => {
    setValue(variable?.default_value || 1.0);
    onChange(variable?.default_value || 1.0);
  };

  const handleSave = () => {
    setValue(value);
    onSave(value);
  };

  const handleDelete = () => {
    remove(index);
  };

  const handleWider = () => {
    setRange(range + 10.0);
  };

  const handleNarrow = () => {
    setRange(Math.max(range - 10.0, 10.0));
  };



  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setValue(Number(event.target.value));
  };

  const baseValue = variable?.default_value || 1.0;
  const minValue = Math.max(variable?.lower_bound || -Infinity, baseValue / range);
  const maxValue = Math.min(variable?.upper_bound || Infinity, baseValue * range);
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
    onChange(truncatedValue);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!variable) {
    return <div>Variable not found</div>;
  }

  return (
    <div data-cy={`parameter-slider-${variable.name}`}>
      <Stack direction="row" spacing={0} alignItems="center">
        <Tooltip title={variable.description} placement='top'>
        <Typography id="discrete-slider" gutterBottom sx={{ flexGrow: 1 }}>
          {unit?.symbol ? `${variable.name} [${unit?.symbol}]` : variable.name}
        </Typography>
        </Tooltip>
        <Tooltip title={"Reset to saved default value"} placement='top'>
        <IconButton aria-label="reset" onClick={handleReset}>
          <Replay />
        </IconButton>
        </Tooltip>
        <Tooltip title={"Save value as default"} placement='top'>
        <IconButton aria-label="save" onClick={handleSave}>
          <Save />
        </IconButton>
        </Tooltip>
        <Tooltip title={"Widen range"} placement='top'>
        <IconButton aria-label="widen" onClick={handleWider}>
          <OpenInFull />
        </IconButton>
        </Tooltip>
        <Tooltip title={"Narrow range"} placement='top'>
        <IconButton aria-label="restrict" onClick={handleNarrow}>
          <CloseFullscreen />
        </IconButton>
        </Tooltip>
        <Tooltip title={"Remove slider"} placement='top'>
        <IconButton aria-label="delete" onClick={handleDelete}>
          <Delete />
        </IconButton>
        </Tooltip>

      </Stack>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={8}>
          <Slider
            value={typeof value === 'number' ? value : 0}
            min={minValue}
            max={maxValue}
            step={stepValue}
            onChange={handleSliderChange}
            onChangeCommitted={handleBlur}
            valueLabelDisplay="off"
            aria-labelledby="input-slider"
          />
        </Grid>
        <Grid item xs={4}>
          <Input
            value={value}
            size="small"
            onChange={handleInputChange}
            onBlur={handleBlur}
            inputProps={{
              step: stepValue,
              min: minValue,
              max: maxValue,
              type: 'number',
              'aria-labelledby': 'input-slider',
            }}
          />
        </Grid>
      </Grid>
    </div>
  );
};

export default SimulationSliderView;