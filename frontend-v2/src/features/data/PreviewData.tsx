import { FC } from "react";
import { Alert, Box } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { StepperState } from "./LoadDataStepper";
import { validateDataRow } from "./normaliseDataHeaders";

interface IPreviewData {
  state: StepperState;
  firstTime: boolean;
}

const IGNORED_COLUMNS = ["Ignore"];

function useNormalisedColumn(state: StepperState, type: string) {
  const normalisedHeaders = [...state.normalisedFields.entries()];
  const [field] =
    normalisedHeaders.find(([key, value]) => value === type) || [];
  const newData = [...state.data];
  if (field && field.toLowerCase() !== type.toLowerCase()) {
    const newFields = [...state.fields];
    const newNormalisedFields = new Map([
      ...state.normalisedFields.entries(),
      [field, "Ignore"],
      [type, type],
    ]);
    if (!newFields.includes(type)) {
      newFields.push(type);
    }
    newData.forEach((row) => {
      row[type] = row[field] || "";
    });
    state.setData(newData);
    state.setFields(newFields);
    state.setNormalisedFields(newNormalisedFields);
  }
  return newData;
}

const PreviewData: FC<IPreviewData> = ({ state, firstTime }: IPreviewData) => {
  useNormalisedColumn(state, "Time");
  useNormalisedColumn(state, "Time Unit");
  useNormalisedColumn(state, "ID");
  useNormalisedColumn(state, "Observation");
  useNormalisedColumn(state, "Observation Unit");
  useNormalisedColumn(state, "Observation ID");
  useNormalisedColumn(state, "Amount");
  useNormalisedColumn(state, "Amount Unit");
  useNormalisedColumn(state, "Administration ID");
  useNormalisedColumn(state, "Additional Doses");
  useNormalisedColumn(state, "Infusion Duration");
  useNormalisedColumn(state, "Infusion Rate");
  useNormalisedColumn(state, "Interdose Interval");
  useNormalisedColumn(state, "Censoring");
  useNormalisedColumn(state, "Event ID");
  useNormalisedColumn(state, "Ignored Observation");
  const { data } = state;
  const fields = Object.keys(data[0]);
  const visibleFields = fields.filter(
    (field) =>
      !IGNORED_COLUMNS.includes(state.normalisedFields.get(field) || ""),
  );
  console.log(fields, visibleFields, state.normalisedFields);
  const visibleRows = data.filter((row) =>
    validateDataRow(row, state.normalisedFields, state.fields),
  );

  return (
    <>
      <Alert severity="info">
        Preview your data. Click &lsquo;Finish&rsquo; to upload and save.
      </Alert>
      <Box
        component="div"
        marginTop={2}
        sx={{ maxHeight: "65vh", overflow: "auto", overflowX: "auto" }}
      >
        <DataGrid
          rows={visibleRows.map((row, index) => ({ id: index, ...row }))}
          columns={visibleFields.map((field) => ({
            field,
            headerName: field,
            minWidth:
              field.endsWith("_var") || field.endsWith("Variable")
                ? 150
                : field.length > 10
                  ? 130
                  : 30,
          }))}
          autoHeight
        />
      </Box>
    </>
  );
};

export default PreviewData;
