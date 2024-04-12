import { FC } from 'react';
import { Box, Button, Table, TableHead, TableRow, TableCell, TableBody, Typography } from "@mui/material";
import { StepperState } from "./LoadDataStepper";

interface IPreviewData {
  state: StepperState;
  firstTime: boolean;
}

const PreviewData: FC<IPreviewData> = ({ state, firstTime }: IPreviewData) => {
  const { data } = state;
  const fields = [
    ...state.fields
  ];
  if (!state.fields.find(field => field === 'Group ID')) {
    fields.push('Group ID')
  }
  if (!state.fields.find(field => field === 'Amount Variable')) {
    fields.push('Amount Variable')
  }
  if (!state.fields.find(field => field === 'Observation Variable')) {
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

  function downloadCSV() {
    const csvHeaders = fields.join(',');
    const csvBody = data.map(row => fields.map(field => row[field]).join(',')).join('\n');
    const csv = `${csvHeaders}\n${csvBody}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  return (
    <>
      <Box component="div" sx={{ maxHeight: "40vh", overflow: 'auto', overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow>
              {fields.map((field, index) => (
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
                {fields.map((field, index) => (
                  <TableCell key={index}>{row[field]}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'right' }}>
        <Button
          variant="outlined"
          onClick={downloadCSV}
        >
          Download CSV
        </Button>
      </Box>
    </>
  )
}

export default PreviewData;
