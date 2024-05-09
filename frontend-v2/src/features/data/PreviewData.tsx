import { FC } from 'react';
import { Box, Table, TableHead, TableRow, TableCell, TableBody, Typography } from "@mui/material";
import { StepperState } from "./LoadDataStepper";
import { Data } from "./LoadData";

interface IPreviewData {
  state: StepperState;
  firstTime: boolean;
}

const PreviewData: FC<IPreviewData> = ({ state, firstTime }: IPreviewData) => {
  function normaliseColumn(data: Data, type: string) {
    const fieldIndex = state.normalisedFields.indexOf(type);
    const field = state.fields[fieldIndex];
    const normalisedField = type;
    const newData = [ ...data ];
    if (fieldIndex > -1 && field !== normalisedField) {
      const fields = [...state.fields];
      const normalisedFields = [...state.normalisedFields];
      normalisedFields[fieldIndex] = 'Ignore';
      if (!fields.includes(normalisedField)) {
        fields.push(normalisedField);
        normalisedFields.push(type);
      } else {
        const normalisedFieldIndex = fields.indexOf(normalisedField);
        normalisedFields[normalisedFieldIndex] = type;
      }
      newData.forEach(row => {
        if (row[field]) {
          row[normalisedField] = row[field];
        }
      });
      state.setData(newData);
      state.setFields(fields);
      state.setNormalisedFields(normalisedFields);
    }
    return newData;
  }

  const { data } = state;
  normaliseColumn(data, 'Time');
  normaliseColumn(data, 'ID');
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
    <Box component="div" sx={{ maxHeight: "65vh", overflow: 'auto', overflowX: 'auto' }}>
      <Table>
        <TableHead>
          <TableRow>
            {visibleFields.map((field, index) => (
              <TableCell key={index}>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1, marginBottom: 1 }} align="center">
                  {field}
                </Typography>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, index) => (
            <TableRow key={index}>
              {visibleFields.map((field, index) => (
                <TableCell key={index}>{row[field]}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  )
}

export default PreviewData;
