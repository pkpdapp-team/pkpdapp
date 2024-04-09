import { FC, useState } from 'react';
import { DataGrid, GridRowId } from '@mui/x-data-grid';
import { StepperState } from './LoadDataStepper';
import SubjectGroupForm from './SubjectGroupForm';

type SubjectGroup = {
  id: string,
  name: string,
  subjects: string[]
}

interface IProtocolDataGrid {
  group: SubjectGroup
  state: StepperState
}

const ProtocolDataGrid: FC<IProtocolDataGrid> = ({ group, state }) => {
  const [selected, setSelected] = useState<GridRowId[]>([]);
  const idField = state.fields.find((field, index) => state.normalisedFields[index] === 'ID');
  const { subjects } = group;
  const subjectRows = subjects.map(subject => {
    const row = state.data.find(row => idField && row[idField] === subject);
    return { id: subject, ...row };
  }).filter(Boolean);
  const subjectColumns = state.fields.map((field) => ({ field, headerName: field }));

  function onRowSelectionModelChange(selection: GridRowId[]) {
    setSelected(selection);
  }
  return (
    <>
      <DataGrid
        rows={subjectRows}
        columns={subjectColumns}
        checkboxSelection
        onRowSelectionModelChange={onRowSelectionModelChange}
      />
      {selected.length > 0 &&
        <SubjectGroupForm group={group} state={state} selected={selected} />
      }
    </>
  );
}

export default ProtocolDataGrid;
