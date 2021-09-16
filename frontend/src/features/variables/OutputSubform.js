import React from "react";
import { useSelector } from 'react-redux'
import {FormCheckboxField } from '../forms/FormComponents';

import { selectUnitById } from '../projects/unitsSlice'
import { selectVariableById } from './variablesSlice'

export default function OutputSubform({control, variable_id}) {
  const variable = useSelector(
    state => selectVariableById(state, variable_id)
  );
  const unit_id = variable.unit
  const unit = useSelector(state => selectUnitById(state, unit_id));
  return (
    <FormCheckboxField
      control={control} 
      defaultValue={variable.default_value}
      name={`outputs[${variable.id}].default_value`} 
      label={`${variable.name} ${unit.symbol}`}
    />
  )
}

