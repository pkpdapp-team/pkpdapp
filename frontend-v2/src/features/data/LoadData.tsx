import { Box, Button, Stack, Typography } from "@mui/material";
import Papa from "papaparse";
import { FC, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import MapHeaders from "./MapHeaders";
import {
  normaliseHeader,
  validateDosingRows,
  validateState,
} from "./dataValidation";
import { StepperState } from "./LoadDataStepper";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import { TableHeader } from "../../components/TableHeader";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { selectIsProjectShared } from "../login/loginSlice";
import { useProjectRetrieveQuery } from "../../app/backendApi";
import { isExcelFile, readExcelFile, readFileAsText } from "./fileUtils";

export type Row = {
  [key: string]: string;
};
export type Data = Row[];
export type Field = string;

const ALLOWED_TYPES = [
  "text/csv",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel", // .xls
];

const style = {
  dropArea: {
    width: "100%",
    height: "150px",
    border: "2px dashed #000",
    marginBottom: "10px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    ":hover": {
      backgroundColor: "#f0f0f0",
    },
  },
  dropAreaContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
};

interface ILoadDataProps {
  state: StepperState;
  firstTime: boolean;
  notificationsInfo: {
    isOpen: boolean;
    count: number;
  };
}

function updateDataAndResetFields(state: StepperState, data: Data) {
  if (data.length > 0) {
    const newFields = Object.keys(data[0]);
    state.data = data;
    const normalisedFields = new Map(newFields.map(normaliseHeader));
    state.normalisedFields = normalisedFields;
  }
}

/*
Add ID field if it doesn't exist.
Assume ascending time values for each subject.
*/
function createDefaultSubjects(state: StepperState) {
  let subjectCount = 1;
  const timeField =
    state.fields.find(
      (field) => state.normalisedFields.get(field) === "Time",
    ) || "Time";
  const newData = state.data.map((row, index) => {
    if (index > 0) {
      const time = parseFloat(row[timeField]);
      const prevTime = parseFloat(state.data[index - 1][timeField]);
      if (time < prevTime) {
        subjectCount++;
      }
    }
    return { ...row, ID: `${subjectCount}` };
  });
  updateDataAndResetFields(state, newData);
}

function createDefaultSubjectGroup(state: StepperState) {
  const newData = [...state.data];
  newData.forEach((row) => {
    row["Group"] = "1";
  });
  updateDataAndResetFields(state, newData);
}

function setMinimumInfusionTime(
  state: StepperState,
  infusionTimeField: string,
) {
  const newData = [...state.data];
  newData.forEach((row) => {
    const infusionTime = parseFloat(row[infusionTimeField]);
    row[infusionTimeField] =
      infusionTime === 0 ? "0.0833" : row[infusionTimeField];
  });
  state.data = newData;
}

function useApiQueries() {
  const projectId = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const { data: project, isLoading: isProjectLoading } =
    useProjectRetrieveQuery({ id: projectId || 0 }, { skip: !projectId });
  const isSharedWithMe = useSelector((state: RootState) =>
    selectIsProjectShared(state, project),
  );
  return {
    isProjectLoading,
    isSharedWithMe,
  };
}

const LoadData: FC<ILoadDataProps> = ({ state, notificationsInfo }) => {
  const showData = state.data.length > 0 && state.fields.length > 0;
  const normalisedHeaders = state.normalisedHeaders;

  const { isProjectLoading, isSharedWithMe } = useApiQueries();

  useEffect(() => {
    if (!normalisedHeaders.includes("ID")) {
      createDefaultSubjects(state);
    }
    if (!normalisedHeaders.includes("Cat Covariate")) {
      createDefaultSubjectGroup(state);
    }

    if (normalisedHeaders.includes("Infusion Duration")) {
      const infusionTimeField =
        state.fields.find(
          (field) => state.normalisedFields.get(field) === "Infusion Duration",
        ) || "Infusion Duration";
      const hasZeroInfusionTime = state.data.some(
        (row) => parseFloat(row[infusionTimeField]) === 0,
      );
      if (hasZeroInfusionTime) {
        setMinimumInfusionTime(state, infusionTimeField);
      }
    }
  }, [normalisedHeaders, state]);

  // Helper function to process CSV data (used for both CSV and Excel files)
  const processCsvData = useCallback(
    (rawCsv: string, fileName: string) => {
      const csvData = Papa.parse(rawCsv.trim(), { header: true });
      const fields = csvData.meta.fields || [];
      const normalisedFields = new Map(fields.map(normaliseHeader));
      state.normalisedFields = normalisedFields;
      // Make a copy of the new state that we can pass to validators.
      const csvState = {
        ...state,
        data: csvData.data as Data,
        fields,
        normalisedFields,
        normalisedHeaders: [...normalisedFields.values()],
      };
      const fieldValidation = validateState(csvState);
      state.hasDosingRows = validateDosingRows(csvState);
      state.data = csvState.data as Data;
      const groupColumn =
        fields.find(
          (field) => normalisedFields.get(field) === "Cat Covariate",
        ) || "Group";
      const errors = csvData.errors
        .map((e) => e.message)
        .concat(fieldValidation.errors);
      state.groupColumn = groupColumn;
      state.errors = errors;
      state.warnings = fieldValidation.warnings;
      state.fileName = fileName;
    },
    [state],
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      state.timeUnit = "";
      state.amountUnit = "";
      state.errors = [];
      state.warnings = [];

      // Process only the first file (dropzone typically handles one file at a time for this use case)
      const file = acceptedFiles[0];
      if (!file) return;

      // Validate file type upfront
      if (!ALLOWED_TYPES.includes(file.type)) {
        state.errors = [
          "File type not supported. Please upload CSV or Excel (.xlsx) files.",
        ];
        return;
      }

      // Check if file is Excel format
      if (isExcelFile(file.name)) {
        // Handle Excel files
        readExcelFile(file)
          .then((csvString) => {
            processCsvData(csvString, file.name);
          })
          .catch((error) => {
            state.errors = [
              error instanceof Error
                ? error.message
                : "Failed to parse Excel file",
            ];
          });
      } else {
        // Handle CSV files
        readFileAsText(file)
          .then((rawCsv) => {
            processCsvData(rawCsv, file.name);
          })
          .catch((error) => {
            state.errors = [
              error instanceof Error
                ? error.message
                : "Failed to read file",
            ];
          });
      }
    },
    [state, processCsvData],
  );
  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    noClick: true,
  });

  const setNormalisedFields = (normalisedFields: Map<Field, string>) => {
    state.normalisedFields = normalisedFields;
    const { errors, warnings } = validateState({
      ...state,
      normalisedFields,
      normalisedHeaders: [...normalisedFields.values()],
    });
    state.errors = errors;
    state.warnings = warnings;
  };

  return (
    <Stack
      sx={{
        display: "flex",
        flexDirection: "column",
        flexGrow: "1",
        flexShrink: "0",
      }}
      spacing={2}
    >
      {!showData && (
        <Box style={style.dropAreaContainer}>
          <Box {...getRootProps({ style: style.dropArea })}>
            <input aria-label="Upload CSV or Excel" {...getInputProps()} />
            <Typography
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              Drag &amp; drop CSV or Excel files here, or click to select files
              <Button
                variant="outlined"
                startIcon={<FileDownloadOutlinedIcon />}
                style={{ marginTop: ".5rem" }}
                onClick={open}
                onKeyDown={open}
                disabled={isSharedWithMe || isProjectLoading}
              >
                Upload Dataset
              </Button>
            </Typography>
          </Box>
        </Box>
      )}
      <Box component="div">
        {showData && (
          <div
            style={{
              maxHeight: "inherit",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <TableHeader
              id="imported-data-table-header"
              label="Imported Data Table"
              tooltip="The column types, which are automatically suggested based on the
              headers in the data, can be customized in the table by selecting
              the desired type from the dropdown lists."
            />
            <MapHeaders
              data={state.data}
              labelId="imported-data-table-header"
              setNormalisedFields={setNormalisedFields}
              normalisedFields={state.normalisedFields}
              notificationsInfo={notificationsInfo}
            />
          </div>
        )}
      </Box>
    </Stack>
  );
};

export default LoadData;
