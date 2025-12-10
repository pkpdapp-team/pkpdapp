import { FC, useState } from "react";
import { DataGrid, GridRowSelectionModel } from "@mui/x-data-grid";
import { StepperState } from "../LoadDataStepper";
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

const ROW_COLS = new Set([
  "Administration Name",
  "Amount",
  "Amount Unit",
  "Per Body Weight(kg)",
]);

const ProtocolDataGrid: FC<IProtocolDataGrid> = ({ group, state }) => {
  const { data = [], normalisedFields = new Map() } = state;
  const fields = Array.from(normalisedFields.keys());
  const [selected, setSelected] = useState<GridRowSelectionModel>({
    type: "include",
    ids: new Set(),
  });
  const idField = fields.find((field) => normalisedFields.get(field) === "ID");
  const { subjects } = group;
  const outputColumns = fields.filter((field) =>
    ROW_COLS.has(normalisedFields.get(field)),
  );
  const amountField =
    fields.find((field) => normalisedFields.get(field) === "Amount") ||
    "Amount";
  const dosingRows = data.filter((row) => row[amountField] !== ".");
  const subjectRows = subjects
    .map((subject) => {
      const row = dosingRows.find((row) => idField && row[idField] === subject);
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

  function onRowSelectionModelChange(selection: GridRowSelectionModel) {
    setSelected(selection);
  }
  return (
    <div
      style={{ height: "inherit", display: "flex", flexDirection: "column" }}
    >
      {selected.ids.size > 0 && (
        <SubjectGroupForm group={group} state={state} selected={selected} />
      )}
      <DataGrid
        density="compact"
        rows={subjectRows}
        columns={subjectColumns}
        checkboxSelection
        onRowSelectionModelChange={onRowSelectionModelChange}
        disableVirtualization={false}
      />
    </div>
  );
};

export default ProtocolDataGrid;
