import { FC } from "react";
import { Alert, Box } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { StepperState } from "./LoadDataStepper";
import { validateDataRow } from "./normaliseDataHeaders";
import { Data } from "./LoadData";

interface IPreviewData {
  state: StepperState;
  firstTime: boolean;
}

const IGNORED_COLUMNS = ["Ignore"];

function useNormalisedColumn(state: StepperState, type: string) {
  const normalisedHeaders = [...state.normalisedFields.entries()];
  const matchingFields =
    normalisedHeaders.filter(([key, value]) => value === type) || [];
  if (matchingFields.length !== 1) {
    // only normalise a column if there is exactly one column of that type.
    return state.data;
  }
  const [field] = matchingFields[0];
  if (field && field.toLowerCase() !== type.toLowerCase()) {
    const newNormalisedFields = new Map([
      ...state.normalisedFields.entries(),
      [field, "Ignore"],
      [type, type],
    ]);
    newNormalisedFields.delete(field);
    const newData: Data = state.data.map((row) => {
      const newRow = { ...row };
      newRow[type] = row[field] || "";
      delete newRow[field];
      return newRow;
    });
    state.setData(newData);
    state.setNormalisedFields(newNormalisedFields);
    return newData;
  }
  return state.data;
}

const PreviewData: FC<IPreviewData> = ({ state }: IPreviewData) => {
  const normalisedHeaders = state.normalisedHeaders
  /* 
    Don't rename cat covariates to 'Cat Covariate'
    or ignored columns to 'Ignore'.
  */
    .filter((header) => !["Cat Covariate", "Ignore"].includes(header));
  normalisedHeaders.forEach((header) => {
    useNormalisedColumn(state, header);
  });
  const { data, fields } = state;
  const visibleFields = fields.filter(
    (field) =>
      !IGNORED_COLUMNS.includes(state.normalisedFields.get(field) || ""),
  );
  const visibleRows = data.filter((row) =>
    validateDataRow(row, state.normalisedFields),
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
