import React, { useEffect } from "react";
import { useSelector, useDispatch } from 'react-redux'
import IconButton from '@material-ui/core/IconButton';
import { useForm, useFormState } from "react-hook-form";
import SaveIcon from '@material-ui/icons/Save';

import {FormCheckboxField, FormTextField} from '../forms/FormComponents'
import { selectSubjectById, updateSubject} from './subjectsSlice'


export default function SubjectSubform({subject_id, disableSave}) {
  const dispatch = useDispatch();
  let subject = useSelector(
    state => selectSubjectById(state, subject_id)
  );
  if (!subject) {
    subject = {
      display: false,
    }
  }

  const { control, handleSubmit, reset } = useForm({
    defaultValues: {
      id: subject.id,
      display: subject.display,
      name: subject.name,
      shape: subject.shape,
    }
  });

  const { isDirty } = useFormState({ control });

  useEffect(() => {
    reset(subject);
  }, [reset, subject]);

  const onSubmit = (values) => {
    console.log('submit subject', values)
    dispatch(updateSubject(values))
  };

  return (
    <React.Fragment>
      <FormCheckboxField
        control={control} 
        name={'display'}
        defaultValue={subject.display}
        label={subject.id_in_dataset}
      />
      <FormTextField
        control={control} 
        name={'shape'}
        label={'Shape'}
        type="number"
      />
      {isDirty &&
        <IconButton
          onClick={handleSubmit(onSubmit)}
          disabled={disableSave}
          size='small'
        >
          <SaveIcon/>
        </IconButton>
      }
    </React.Fragment>
  )
}
