import React from 'react';
import { SimulationSlider, useVariableRetrieveQuery } from '../../app/backendApi';
import { Slider, Typography } from '@mui/material';

interface SimulationSliderProps {
  slider: SimulationSlider;
  onChange: (value: number) => void;
}

const SimulationSliderView: React.FC<SimulationSliderProps> = ({ slider, onChange }) => {
  const { data: variable, isLoading } = useVariableRetrieveQuery({id: slider.variable});

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!variable) {
    return <div>Variable not found</div>;
  }

  const handleChange = (event: Event, value: number | number[]) => {
    onChange(value as number);
  };

  const baseValue = variable.default_value || 1.0;

  return (
    <div>
      <Typography id="discrete-slider" gutterBottom>
        {variable.name}
      </Typography>
      <Slider
        min={baseValue / 10.0}
        max={baseValue * 10.0}
        step={baseValue / 100.0}
        onChange={handleChange}
        valueLabelDisplay="auto"
        aria-labelledby="discrete-slider"
      />
    </div>
  );
};

export default SimulationSliderView;