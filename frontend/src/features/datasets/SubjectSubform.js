import React, { useEffect } from "react";
import { useSelector, useDispatch } from 'react-redux'
import IconButton from '@material-ui/core/IconButton';
import { useForm, useFormState } from "react-hook-form";
import SaveIcon from '@material-ui/icons/Save';

import {FormCheckboxField} from '../forms/FormComponents'
import { selectSubjectById, updateSubject} from './subjectsSlice'



export default function SubjectSubform({subject_id}) {
  const dispatch = useDispatch();
  let subject = useSelector(
    state => selectSubjectById(state, subject_id)
  );
  console.log('rendering subject', subject_id, subject)
  if (!subject) {
    subject = {
      display: false,
    }
  }

  const { control, handleSubmit, reset } = useForm({
    defaultValues: {
      id: subject.id,
      display: subject.display,
      name: subject.name
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
