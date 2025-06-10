import { FC } from "react";
import { Box } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { StepperState } from "./LoadDataStepper";
import { validateDataRow } from "./dataValidation";
import { Data } from "./LoadData";
import { TableHeader } from "../../components/TableHeader";
import {
  calculateTableHeights,
  getTableHeight,
  SINGLE_TABLE_BREAKPOINTS,
} from "../../shared/calculateTableHeights";

interface IPreviewData {
  state: StepperState;
  firstTime: boolean;
  notificationsInfo: {
    isOpen: boolean;
    count: number;
  };
}

const IGNORED_COLUMNS = ["Ignore"];

function normaliseDataColumn(state: StepperState, type: string) {
  const normalisedHeaders = [...state.normalisedFields.entries()];
  const matchingFields =
    normalisedHeaders.filter(([_key, value]) => value === type) || [];
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

const PreviewData: FC<IPreviewData> = ({
  state,
  notificationsInfo,
}: IPreviewData) => {
  const normalisedHeaders = state.normalisedHeaders
    /* 
    Don't rename cat covariates to 'Cat Covariate',
    continuous covariates to 'Cont Covariate',
    or ignored columns to 'Ignore'.
  */
    .filter(
      (header) =>
        !["Cat Covariate", "Cont Covariate", "Ignore"].includes(header),
    );
  normalisedHeaders.forEach((header) => {
    normaliseDataColumn(state, header);
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
      <TableHeader
        id="preview-dataset-header"
        label="Preview Dataset"
        tooltip="Preview your data. Click 'Finish' to upload and save."
      />
      <Box sx={{ width: "100%", marginTop: ".5rem" }}>
        <Box
          sx={{
            height: calculateTableHeights({
              baseHeight: getTableHeight({ steps: SINGLE_TABLE_BREAKPOINTS }),
              count: notificationsInfo.count,
              isOpen: notificationsInfo.isOpen,
            }),
            width: "100%",
            transition: "all .35s ease-in",
          }}
        >
          <DataGrid
            aria-labelledby="preview-dataset-header"
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
          />
        </Box>
      </Box>
    </>
  );
};

export default PreviewData;
