import { Box, Input, InputLabel } from '@mui/material';
import { GridRowId } from '@mui/x-data-grid';
import { FC, FormEvent, useRef } from 'react';
import { StepperState } from './LoadDataStepper';

type SubjectGroup = {
  id: string,
  name: string,
  subjects: string[]
}

interface ISubjectGroupForm {
  group: SubjectGroup,
  state: StepperState,
  selected: GridRowId[]
}

const SubjectGroupForm: FC<ISubjectGroupForm> = ({ group, selected, state }) => {
  const selectedGroupInput = useRef<HTMLInputElement>(null);
  const idField = state.fields.find((field, index) => state.normalisedFields[index] === 'ID');

  function onSubmitGroupIDForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const newValue = selectedGroupInput.current?.value || group.id;
    const newData = [...state.data];
    selected.forEach((id) => {
      newData.filter(row => idField ? row[idField] === id : false)
      .forEach(row => {
        row['Group'] = newValue;
        row['Group ID'] = newValue;
      });
    });
    state.setData(newData);
  }

  return (
    <Box
      component='form'
      onSubmit={onSubmitGroupIDForm}
      padding='1rem'
      sx={{
        border: '1px solid',
        borderColor: 'primary.light',
        width: 'fit-content',
      }}
    >
      <InputLabel
        htmlFor='selected-group'
        sx={{
          fontSize: '0.75rem',
        }}
      >
        Change the group ID for selected rows
      </InputLabel>
      <Input
        inputRef={selectedGroupInput}
        type='number'
        id='selected-group'
        defaultValue={group.id}
        sx={{
          fontSize: '0.75rem',
        }}
      />
    </Box>
  )
}

export default SubjectGroupForm;