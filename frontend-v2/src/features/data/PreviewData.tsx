import { FC } from 'react';
import { Box, Table, TableHead, TableRow, TableCell, TableBody, Typography } from "@mui/material";
import { StepperState } from "./LoadDataStepper";

interface IPreviewData {
  state: StepperState;
  firstTime: boolean;
}

const PreviewData: FC<IPreviewData> = ({ state, firstTime }: IPreviewData) => {
  const { data } = state;
  const fields = [
    ...state.fields,
    'cohort',
    'Amount Variable',
    'Observation Variable'
  ];
  if (!state.normalisedFields.find(field => field === 'Amount Unit')) {
    fields.push('Amount Unit')
  }
  if (!state.normalisedFields.find(field => field === 'Observation Unit')) {
    fields.push('Observation Unit')
  }

  return (
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
  )
}

export default PreviewData;
