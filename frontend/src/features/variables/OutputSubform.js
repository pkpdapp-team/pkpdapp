import React, {useEffect} from "react";
import { useSelector } from 'react-redux'
import {FormCheckboxField, FormTextField, FormSelectField} from '../forms/FormComponents'
import { useForm, useFormState } from "react-hook-form";
import SaveIcon from '@material-ui/icons/Save';
import IconButton from '@material-ui/core/IconButton';
import { useDispatch } from 'react-redux'
import { selectUnitById } from '../projects/unitsSlice'
import { selectVariableById, updateVariable } from './variablesSlice'

export default function OutputSubform({variable_id}) {
  const dispatch = useDispatch();
  let variable = useSelector(
    state => selectVariableById(state, variable_id)
  );
  if (!variable) {
    variable = {
      display: 0,
      default_value: 0,
      lower_bound: -1,
      upper_bound: 1,
      unit: 1,
      color: 0
    }
  }
  const { control, handleSubmit, reset } = useForm({
    defaultValues: {
      id: variable.id,
      display: variable.display,
      color: variable.color,
      unit: variable.unit,
    }
  });

  useEffect(() => {
    reset(variable);
  }, [reset, variable]);

  const unit_id = variable ? variable.unit : 1
  let unit = useSelector(state => selectUnitById(state, unit_id));
  if (!unit) {
    unit = {
      symbol: 'X',
      compatible_units: []
    }
  }
  const unitOptions = unit.compatible_units.map(
    u => { return {key: u.symbol, value: u.id}}
  )
  const label = `${variable.name}`

  const onSubmit = (values) => {
    dispatch(updateVariable(values))
  };

  const { isDirty } = useFormState({ control });
  
  return (
    <React.Fragment>
      <FormCheckboxField
        control={control} 
        name={'display'} 
        label={label}
      />
      <FormSelectField
        control={control} 
        name={'unit'}
        label={'Unit'}
        options={unitOptions}
      />
      <FormTextField
        control={control} 
        name={'color'}
        label={'Color'}
        type="number"
      />
      {isDirty &&
          <IconButton
            onClick={handleSubmit(onSubmit)}
            size='small'
          >
            <SaveIcon/>
          </IconButton>
        }
    </React.Fragment>
  )
}

