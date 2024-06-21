import { Box, Stack, Typography } from "@mui/material";
import Papa from "papaparse";
import { FC, useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import MapHeaders from "./MapHeaders";
import { normaliseHeader, validateState } from "./normaliseDataHeaders";
import { StepperState } from "./LoadDataStepper";
import SetUnits from "./SetUnits";

export type Row = { [key: string]: string };
export type Data = Row[];
export type Field = string;

const ALLOWED_TYPES = ["text/csv", "text/plain"];

const style = {
  dropArea: {
    width: "100%",
    height: "150px",
    border: "2px dashed #000",
    marginBottom: "10px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    cursor: "pointer",
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
}

function updateDataAndResetFields(state: StepperState, data: Data) {
  if (data.length > 0) {
    const newFields = Object.keys(data[0]);
    state.setFields(newFields);
    state.setData(data);
    const normalisedFields = new Map(newFields.map(normaliseHeader));
    state.setNormalisedFields(normalisedFields);
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

function setMinimumInfusionTime(state: StepperState) {
  const infusionTimeField =
    state.fields.find(
      (field) => state.normalisedFields.get(field) === "Infusion Duration",
    ) || "Infusion Duration";
  const hasZeroInfusionTime = state.data.some(
    (row) => parseFloat(row[infusionTimeField]) === 0,
  );
  if (hasZeroInfusionTime) {
    const newData = [...state.data];
    newData.forEach((row) => {
      const infusionTime = parseFloat(row[infusionTimeField]);
      row[infusionTimeField] =
        infusionTime === 0 ? "0.0833" : row[infusionTimeField];
    });
    state.setData(newData);
  }
}

const LoadData: FC<ILoadDataProps> = ({ state, firstTime }) => {
  const [showData, setShowData] = useState<boolean>(
    state.data.length > 0 && state.fields.length > 0,
  );
  const normalisedHeaders = [...state.normalisedFields.values()];
  if (!normalisedHeaders.includes("ID")) {
    createDefaultSubjects(state);
  }
  if (!normalisedHeaders.includes("Cat Covariate")) {
    createDefaultSubjectGroup(state);
  }
  if (normalisedHeaders.includes("Infusion Duration")) {
    setMinimumInfusionTime(state);
  }

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      state.setTimeUnit("");
      state.setAmountUnit("");
      state.setErrors([]);
      state.setWarnings([]);
      acceptedFiles.forEach((file) => {
        const reader = new FileReader();

        reader.onabort = () => state.setErrors(["file reading was aborted"]);
        reader.onerror = () => state.setErrors(["file reading has failed"]);
        reader.onload = () => {
          if (!ALLOWED_TYPES.includes(file.type)) {
            state.setErrors([
              "Only CSV files are supported. Please upload a CSV file.",
            ]);
            return;
          }
          state.setFileName(file.name);
          // Parse the CSV data
          const rawCsv = reader.result as string;
          const csvData = Papa.parse(rawCsv.trim(), { header: true });
          const fields = csvData.meta.fields || [];
          const normalisedFields = new Map(fields.map(normaliseHeader));
          const fieldValidation = validateState({
            ...state,
            data: csvData.data as Data,
            fields,
            normalisedFields,
          });
          const primaryCohort =
            fields.find(
              (field) => normalisedFields.get(field) === "Cat Covariate",
            ) || "Group";
          const errors = csvData.errors
            .map((e) => e.message)
            .concat(fieldValidation.errors);
          state.setData(csvData.data as Data);
          state.setFields(fields);
          state.setNormalisedFields(normalisedFields);
          state.setPrimaryCohort(primaryCohort);
          state.setErrors(errors);
          state.setWarnings(fieldValidation.warnings);
          if (csvData.data.length > 0 && csvData.meta.fields) {
            setShowData(true);
          }
        };
        reader.readAsText(file);
      });
    },
    [state],
  );
  const { getRootProps, getInputProps } = useDropzone({ onDrop });

  const setNormalisedFields = (normalisedFields: Map<Field, string>) => {
    state.setNormalisedFields(normalisedFields);
    const { errors, warnings } = validateState({
      ...state,
      normalisedFields,
    });
    state.setErrors(errors);
    state.setWarnings(warnings);
  };

  return (
    <Stack spacing={2}>
      <Box
        sx={{
          width: "100%",
          maxHeight: "24vh",
          overflow: "auto",
          whiteSpace: "nowrap",
        }}
      >
        {showData && <SetUnits state={state} firstTime={firstTime} />}
      </Box>
      <Box style={style.dropAreaContainer}>
        <Box {...getRootProps({ style: style.dropArea })}>
          <input {...getInputProps()} />
          <Typography>
            Drag &amp; drop some files here, or click to select files
          </Typography>
        </Box>
      </Box>
      <Box
        component="div"
        sx={{ maxHeight: "40vh", overflow: "auto", overflowX: "auto" }}
      >
        {showData && (
          <MapHeaders
            data={state.data}
            fields={state.fields}
            setNormalisedFields={setNormalisedFields}
            normalisedFields={state.normalisedFields}
          />
        )}
      </Box>
    </Stack>
  );
};

export default LoadData;
