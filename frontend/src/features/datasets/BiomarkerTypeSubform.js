import React, { useEffect } from "react";
import { useSelector, useDispatch } from 'react-redux'
import IconButton from '@material-ui/core/IconButton';
import { useForm, useFormState } from "react-hook-form";
import SaveIcon from '@material-ui/icons/Save';

import {FormCheckboxField} from '../forms/FormComponents'
import { selectUnitById } from '../projects/unitsSlice'
import { selectBiomarkerTypeById, updateBiomarkerType } from './biomarkerTypesSlice'



export default function BiomarkerTypeSubform({biomarker_id}) {
  const dispatch = useDispatch();
  let biomarker_type = useSelector(
    state => selectBiomarkerTypeById(state, biomarker_id)
  );
  if (!biomarker_type) {
    biomarker_type = {
      default_value: false,
    }
  }
  const unit_id = biomarker_type ? biomarker_type.unit : 1
  let unit = useSelector(state => selectUnitById(state, unit_id));
  if (!unit) {
    unit  = {
      symbol: 'X'
    }
  }

  const { control, handleSubmit, reset } = useForm({
    defaultValues: {
      id: biomarker_type.id,
      display: biomarker_type.display,
      name: biomarker_type.name
    }
  });

  const { isDirty } = useFormState({ control });

  useEffect(() => {
    reset(biomarker_type);
  }, [reset, biomarker_type]);

  const onSubmit = (values) => {
    console.log('submit biomarker_type', values)
    dispatch(updateBiomarkerType(values))
  };

  console.log('bt subform', biomarker_type)

  return (
    <React.Fragment>
      <FormCheckboxField
        control={control} 
        name={'display'}
        defaultValue={biomarker_type.display}
        label={`${biomarker_type.name} ${unit.symbol}`}
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
