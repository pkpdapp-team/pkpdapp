import React, {useEffect} from "react";
import { useSelector } from 'react-redux'
import {FormCheckboxField } from '../forms/FormComponents';
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
      default_value: 0,
      lower_bound: -1,
      upper_bound: 1,
    }
  }
  const { control, handleSubmit, reset } = useForm({
    defaultValues: {
      id: variable.id,
      display: variable.display,
    }
  });

  useEffect(() => {
    reset(variable);
  }, [reset, variable]);

  const unit_id = variable ? variable.unit : 1
  let unit = useSelector(state => selectUnitById(state, unit_id));
  if (!unit) {
    unit = {
      symbol: 'X'
    }
  }
  const label = `${variable.name} ${unit.symbol}`

  const onSubmit = (values) => {
    console.log('submit output variable', values)
    dispatch(updateVariable(values))
  };

  const { isDirty } = useFormState({ control });
  
  return (
    <React.Fragment>
      <FormCheckboxField
        control={control} 
        name={`display`} 
        label={label}
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

