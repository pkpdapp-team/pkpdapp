import React, { SyntheticEvent, useEffect } from 'react';
import { SimulationSlider, useVariableRetrieveQuery } from '../../app/backendApi';
import { Grid, IconButton, Input, Slider, Stack, Typography } from '@mui/material';
import { Delete } from '@mui/icons-material';

interface SimulationSliderProps {
  index: number;
  slider: SimulationSlider;
  onChange: (value: number) => void;
  remove: (index: number) => void;
}

const SimulationSliderView: React.FC<SimulationSliderProps> = ({ index, slider, onChange, remove }) => {
  const { data: variable, isLoading } = useVariableRetrieveQuery({id: slider.variable});

  const [value, setValue] = React.useState<number>(
    variable?.default_value || 1.0,
  );

  useEffect(() => {
    setValue(variable?.default_value || 1.0);
  }, [variable]);

  const handleSliderChange = (event: Event | SyntheticEvent<Element, Event>, newValue: number | number[]) => {
    if (typeof newValue === 'number') {
      setValue(newValue);
    }
  };


  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setValue(Number(event.target.value));
  };

  const baseValue = variable?.default_value || 1.0;
  const minValue = baseValue / 10.0;
  const maxValue = baseValue * 10.0;
  const stepValue = baseValue / 100.0;

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
    <div>
      <Stack direction="row" spacing={2} alignItems="center">
        <Typography id="discrete-slider" gutterBottom>
          {variable.name}
        </Typography>
        <IconButton aria-label="delete" onClick={() => remove(index)}>
          <Delete />
        </IconButton>
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