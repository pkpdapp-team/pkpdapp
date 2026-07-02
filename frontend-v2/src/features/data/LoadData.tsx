import { Box, Button, IconButton, Stack, Typography } from "@mui/material";
import HelpOutline from "@mui/icons-material/HelpOutline";
import Papa from "papaparse";
import { FC, useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import MapHeaders from "./MapHeaders";
import {
  defaultGroupColumn,
  groupedHeaders,
  headerTypeDescriptions,
  normalisedFieldsFromData,
  normaliseFields,
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
import { isExcelFile, readExcelFile, readFileAsText, truncateFileName } from "./fileUtils";
import ExampleFormatsDialog from "./ExampleFormatsDialog";

export type Row = {
  [key: string]: string;
};
export type Data = Row[];
export type Field = string;

const MAP_HEADER_HELP = (
  <>
    <p>
      The column types, which are automatically suggested based on the headers
      in the data, can be customized in the table by selecting the desired type
      from the dropdown lists.
    </p>
    <p>The column types you can map are:</p>
    {Object.entries(groupedHeaders).map(([group, headers]) => (
      <div key={group}>
        <p style={{ marginBottom: 0 }}>
          <strong>{group}</strong>
        </p>
        <ul style={{ marginTop: "0.25rem" }}>
          {headers.map((header) => (
            <li key={header}>
              <strong>{header}</strong> – {headerTypeDescriptions[header]?.short}
            </li>
          ))}
        </ul>
      </div>
    ))}
    <p style={{ marginBottom: 0 }}>
      <strong>Dosing rows and observation rows</strong>
    </p>
    <p style={{ marginTop: "0.25rem" }}>
      Each row is treated as a dose if it has a value in the Amount column (or an
      Administration ID), and as an observation if it has a numeric value in an
      Observation column. A single row can be both a dose and an observation at
      the same time. Every row needs a valid, non-negative time; observations
      flagged as censored or ignored (MDV) are dropped.
    </p>
    <p style={{ marginBottom: 0 }}>
      <strong>Long and wide formats</strong>
    </p>
    <p style={{ marginTop: "0.25rem" }}>
      In long format there is a single Observation column together with an
      Observation ID column that identifies which output each row belongs to.
    </p>
    <p style={{ marginTop: "0.25rem" }}>
      In wide format there is a separate Observation column for each output. Map
      each of those columns as Observation and they are automatically combined
      into long format, using each column&apos;s header as its Observation ID. When
      wide columns are combined, the dose Amount is kept only against the first
      observation column so doses are not counted more than once.
    </p>
  </>
);

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
    state.data = data;
    const normalisedFields = normalisedFieldsFromData(
      data,
      state.normalisedFields,
    );
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
  const [showExamples, setShowExamples] = useState(false);

  const { isProjectLoading, isSharedWithMe } = useApiQueries();

  useEffect(() => {
    // Check if ID column exists in the actual data, not just in normalisedHeaders
    // This prevents re-creating ID column when user manually changes other mappings
    const hasIDInData = state.data.length > 0 && "ID" in state.data[0];
    if (!normalisedHeaders.includes("ID") && !hasIDInData) {
      createDefaultSubjects(state);
    }

    // Check if Group column exists in the actual data
    // This prevents re-creating Group column when user manually changes other mappings
    const hasGroupInData = state.data.length > 0 && "Group" in state.data[0];
    if (
      !normalisedHeaders.includes("Cat Covariate") &&
      !normalisedHeaders.includes("Group ID") &&
      !hasGroupInData
    ) {
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
      console.log(state.encoding);
      const csvData = Papa.parse(rawCsv.trim(), { header: true });
      const fields = csvData.meta.fields || [];
      const normalisedFields = normaliseFields(fields);
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
      state.data = fieldValidation.data as Data;
      const groupColumn = defaultGroupColumn(fields, normalisedFields);
      const errors = csvData.errors
        .map((e) => e.message)
        .concat(fieldValidation.errors);
      state.groupColumn = groupColumn;
      state.errors = errors;
      state.warnings = [...state.warnings, ...fieldValidation.warnings];
      state.fileName = truncateFileName(fileName);
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
          .then(({ text, encoding, source }) => {
            console.info(
              `Detected file encoding: ${encoding} (source: ${source})`,
            );
            state.encoding = encoding;
            processCsvData(text, file.name);
          })
          .catch((error) => {
            state.errors = [
              error instanceof Error ? error.message : "Failed to read file",
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
    const groupColumn = defaultGroupColumn(state.fields, normalisedFields);
    state.normalisedFields = normalisedFields;
    const { errors, warnings, data } = validateState({
      ...state,
      normalisedFields,
      normalisedHeaders: [...normalisedFields.values()],
    });
    state.data = data;
    state.errors = errors;
    state.warnings = warnings;
    state.groupColumn = groupColumn;
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
              component="div"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              Drag &amp; drop CSV or Excel files here, or click to select files
              <Box
                sx={{ display: "flex", alignItems: "center", mt: ".5rem" }}
              >
                <Button
                  variant="outlined"
                  startIcon={<FileDownloadOutlinedIcon />}
                  onClick={open}
                  onKeyDown={open}
                  disabled={isSharedWithMe || isProjectLoading}
                >
                  Upload Dataset
                </Button>
                <IconButton
                  onClick={(event) => {
                    event.stopPropagation();
                    setShowExamples(true);
                  }}
                >
                  <HelpOutline titleAccess="Example file formats" />
                </IconButton>
              </Box>
            </Typography>
          </Box>
        </Box>
      )}
      <ExampleFormatsDialog
        open={showExamples}
        onClose={() => setShowExamples(false)}
      />
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
              tooltip={MAP_HEADER_HELP}
              tooltipMaxWidth="32rem"
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
