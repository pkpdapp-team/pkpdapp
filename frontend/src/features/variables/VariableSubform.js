import React, {useEffect} from "react";
import { useSelector } from 'react-redux'
import {FormSliderField, FormTextField } from '../forms/FormComponents';
import Box from "@material-ui/core/Box";
import { useForm, useFormState } from "react-hook-form";
import SaveIcon from '@material-ui/icons/Save';
import { useDispatch } from 'react-redux'
import IconButton from '@material-ui/core/IconButton';
import { selectUnitById } from '../projects/unitsSlice'
import { selectVariableById, updateVariable } from './variablesSlice'


export default function VariableSubform({variable_id}) {
  const dispatch = useDispatch();
  let variable = useSelector(
    state => selectVariableById(state, variable_id)
  );
  if (!variable) {
    variable = {
      default_value: 0,
      lower_bound: -1,
      upper_bound: 1,
      unit: 0,
    }
  }
  const { control, handleSubmit, getValues, reset } = useForm({
    defaultValues: {
      id: variable.id,
      default_value: variable.default_value,
      lower_bound: variable.lower_bound,
      upper_bound: variable.upper_bound,
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
  let truncatedLabel = label
  const maxLength = 22
  if (label.length > maxLength) {
    truncatedLabel = label.slice(0, maxLength-2) + '...'
  }

  const onSubmit = (values) => {
    dispatch(updateVariable(values))
  };

  const { isDirty } = useFormState({ control });
  const current_lower_bound = getValues('lower_bound')
  const current_upper_bound = getValues('upper_bound')

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
      <Box position="absolute" top={55} bottom={0} left={0} right={'55%'}>
        <FormTextField 
          control={control} 
          inputProps={{step: 'any', style: { fontSize: 13,textAlign: 'left' }}} 
          name={'lower_bound'} 
          type="number"
          helperText="lower bound"
          size="small"
        />
      </Box>
      <Box position="absolute" top={55} bottom={0} left={'55%'} right={-15} >
        <FormTextField 
          control={control} 
          inputProps={{step: 'any', style: { fontSize: 13, textAlign: 'right' }}} 
          name={'upper_bound'} 
          helperText="upper bound"
          type="number"
          size="small"
        />
      </Box>
      <Box position="absolute" top={5} bottom={0} left={'90%'} right={0} >
      {isDirty &&
        <IconButton
          onClick={handleSubmit(onSubmit)}
          size='small'
        >
          <SaveIcon/>
        </IconButton>
      }  
      </Box>
      <FormSliderField
        control={control} 
        name={'default_value'} 
        tooltip={label}
        label={truncatedLabel}
        min={current_lower_bound} max={current_upper_bound}
      />
      </Box>
    </React.Fragment>
  )
}
