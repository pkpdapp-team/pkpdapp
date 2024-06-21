import { FC, useState } from "react";
import { DataGrid, GridRowId } from "@mui/x-data-grid";
import { StepperState } from "./LoadDataStepper";
import SubjectGroupForm from "./SubjectGroupForm";

type SubjectGroup = {
  id: string;
  name: string;
  subjects: string[];
};

interface IProtocolDataGrid {
  group: SubjectGroup;
  state: StepperState;
}

const ROW_COLS = ["Amount", "Amount Unit"];

const ProtocolDataGrid: FC<IProtocolDataGrid> = ({ group, state }) => {
  const [selected, setSelected] = useState<GridRowId[]>([]);
  const idField = state.fields.find(
    (field) => state.normalisedFields.get(field) === "ID",
  );
  const { subjects } = group;
  const outputColumns = state.fields.filter((field) =>
    ROW_COLS.includes(state.normalisedFields.get(field) || ""),
  );
  const subjectRows = subjects
    .map((subject) => {
      const row = state.data.find((row) => idField && row[idField] === subject);
      const rowEntries: string[][] = outputColumns.map((field) =>
        row ? [field, row[field]] : [field, ""],
      );
      return {
        id: subject,
        "Group ID": group.id,
        ID: subject,
        ...Object.fromEntries(rowEntries),
      };
    })
    .filter(Boolean);
  const subjectColumns = ["Group ID", "ID", ...outputColumns].map((field) => ({
    field,
    headerName: field,
  }));

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
      {selected.length > 0 && (
        <SubjectGroupForm group={group} state={state} selected={selected} />
      )}
    </>
  );
};

export default ProtocolDataGrid;
