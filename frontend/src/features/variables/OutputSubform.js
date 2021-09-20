import React from "react";
import { useSelector } from 'react-redux'
import {FormCheckboxField } from '../forms/FormComponents';

import { selectUnitById } from '../projects/unitsSlice'
import { selectVariableById } from './variablesSlice'

export default function OutputSubform({control, variable_id}) {
  let variable = useSelector(
    state => selectVariableById(state, variable_id)
  );
  if (!variable) {
    variable = {
      default_value: false,
    }
  }
  const unit_id = variable ? variable.unit : 1
  let unit = useSelector(state => selectUnitById(state, unit_id));
  if (!unit) {
    unit  = {
      symbol: 'X'
    }
  }
  return (
    <FormCheckboxField
      control={control} 
      defaultValue={variable.default_value}
      name={`outputs[${variable.id}].default_value`} 
      label={`${variable.name} ${unit.symbol}`}
    />
  )
}

