import { FC } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { IProtocol } from './protocolUtils';
import { StepperState } from './LoadDataStepper';

interface IProtocolDataGrid {
  protocol: IProtocol
  state: StepperState
}

const ProtocolDataGrid: FC<IProtocolDataGrid> = ({ protocol, state }) => {
  const idField = state.fields.find((field, index) => state.normalisedFields[index] === 'ID');
  const amountField = state.fields.find((field, index) => state.normalisedFields[index] === 'Amount');
  const { subjects } = protocol;
  const protocolRows = state.data.filter(row => {
    const subjectId = idField && row[idField];
    const amount = amountField && +row[amountField];
    return subjects.includes(subjectId || '') && amount;
  }).map(row => {
    const subjectId = (idField && +row[idField]) || 0;
    return { id: +subjectId, ...row };
  });
  const protocolColumns = state.fields.map((field) => ({ field, headerName: field }));
  return (
    <DataGrid
      rows={protocolRows}
      columns={protocolColumns}
      checkboxSelection
    />
  );
}

export default ProtocolDataGrid;
