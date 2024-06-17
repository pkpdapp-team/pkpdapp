import { FC } from 'react';
import { Alert, Box } from "@mui/material";
import { DataGrid } from '@mui/x-data-grid';
import { StepperState } from "./LoadDataStepper";

interface IPreviewData {
  state: StepperState;
  firstTime: boolean;
}

function useNormalisedColumn(state: StepperState, type: string) {
  const fieldIndex = state.normalisedFields.indexOf(type);
  const field = state.fields[fieldIndex];
  const normalisedField = type;
  const newData = [ ...state.data ];
  if (fieldIndex > -1 && field !== normalisedField) {
    const newFields = [...state.fields];
    const newNormalisedFields = [...state.normalisedFields];
    newNormalisedFields[fieldIndex] = 'Ignore';
    if (!newFields.includes(normalisedField)) {
      newFields.push(normalisedField);
      newNormalisedFields.push(type);
    } else {
      const normalisedFieldIndex = newFields.indexOf(normalisedField);
      newNormalisedFields[normalisedFieldIndex] = type;
    }
    newData.forEach(row => {
      if (row[field]) {
        row[normalisedField] = row[field];
      }
    });
    state.setData(newData);
    state.setFields(newFields);
    state.setNormalisedFields(newNormalisedFields);
  }
  return newData;
}

const PreviewData: FC<IPreviewData> = ({ state, firstTime }: IPreviewData) => {
  useNormalisedColumn(state, 'Time');
  useNormalisedColumn(state, 'Time Unit');
  useNormalisedColumn(state, 'ID');
  useNormalisedColumn(state, 'Observation');
  useNormalisedColumn(state, 'Observation Unit');
  useNormalisedColumn(state, 'Observation ID');
  useNormalisedColumn(state, 'Amount');
  useNormalisedColumn(state, 'Amount Unit');
  useNormalisedColumn(state, 'Administration ID');
  useNormalisedColumn(state, 'Additional Doses');
  useNormalisedColumn(state, 'Infusion Duration');
  useNormalisedColumn(state, 'Infusion Rate');
  useNormalisedColumn(state, 'Interdose Interval');
  const { data } = state;
  const fields = [
    ...state.fields
  ];
  if (!state.fields.find(field => field === 'Group ID')) {
    fields.push('Group ID')
  }
  if (!state.normalisedFields.find(field => field === 'Amount Variable')) {
    fields.push('Amount Variable')
  }
  if (!state.normalisedFields.find(field => field === 'Observation Variable')) {
    fields.push('Observation Variable')
  }
  if (!state.normalisedFields.find(field => field === 'Amount')) {
    fields.push('Amount')
  }
  if (!state.normalisedFields.find(field => field === 'Time Unit')) {
    fields.push('Time_unit')
  }
  if (!state.normalisedFields.find(field => field === 'Amount Unit')) {
    fields.push('Amt_unit')
  }
  if (
    !state.normalisedFields.find(field => field === 'Observation Unit') &&
    !state.fields.find(field => field === 'Observation_unit')
  ) {
    fields.push('Observation_unit')
  }
  const visibleFields = fields.filter(
    (field, index) => state.normalisedFields[index] !== 'Ignore'
  );

  return (
    <>
      <Alert severity='info'>
        Preview your data. Click 'Finish' to upload and save.
      </Alert>
      <Box component="div" marginTop={2} sx={{ maxHeight: "65vh", overflow: 'auto', overflowX: 'auto' }}>
        <DataGrid
          rows={data.map((row, index) => ({ id: index, ...row }))}
          columns={
            visibleFields.map((field) => ({
              field,
              headerName: field,
              minWidth: (field.endsWith('_var') || field.endsWith('Variable')) ? 150 :
                field.length > 10 ? 130 : 30
            }))
          }
          autoHeight
        />
      </Box>
    </>
  )
}

export default PreviewData;
