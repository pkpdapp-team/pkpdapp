import React from "react";
import { useSelector } from 'react-redux'
import {FormSliderField, FormTextField } from '../forms/FormComponents';
import Box from "@material-ui/core/Box";

import { selectUnitById } from '../projects/unitsSlice'
import { selectVariableById } from './variablesSlice'


export default function VariableSlider({control, variable_id}) {
  const variable = useSelector(
    state => selectVariableById(state, variable_id)
  );
  const unit_id = variable.unit
  const unit = useSelector(state => selectUnitById(state, unit_id));
  const label = `${variable.name} ${unit.symbol}`
  let truncatedLabel = label
  const maxLength = 22
  if (label.length > maxLength) {
    truncatedLabel = label.slice(0, maxLength-2) + '...'
  }

  return (
    <React.Fragment>
    
    <Box
      component="span"
      position="relative"
      height={120}
      width='100%'
      minWidth={200}
      mx={1}
    >
      <Box position="absolute" top={50} bottom={0} left={0} right={'55%'}>
        <FormTextField 
          control={control} 
          defaultValue={variable.lower_bound}
          inputProps={{step: 'any', style: { fontSize: 13,textAlign: 'left' }}} 
          name={`${type}[${variable.qname}].lower_bound`} 
          type="number"
          helperText="lower bound"
          size="small"
        />
      </Box>
      <Box position="absolute" top={50} bottom={0} left={'55%'} right={-15} >
        <FormTextField 
          control={control} 
          defaultValue={variable.upper_bound}
          inputProps={{step: 'any', style: { fontSize: 13, textAlign: 'right' }}} 
          name={`${type}[${variable.qname}].upper_bound`} 
          helperText="upper bound"
          type="number"
          size="small"
        />
      </Box>
      <FormSliderField
        control={control} 
        defaultValue={variable.default_value}
        name={`${type}[${variable.qname}].default_value`} 
        tooltip={label}
        label={truncatedLabel}
        min={variable.lower_bound} max={variable.upper_bound}
      />
      </Box>
    </React.Fragment>
  )
}
