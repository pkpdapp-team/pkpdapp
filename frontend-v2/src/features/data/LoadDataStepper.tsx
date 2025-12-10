import { FC } from "react";
import { useSelector } from "react-redux";
import Papa from "papaparse";
import Box from "@mui/material/Box";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepButton from "@mui/material/StepButton";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import LoadData from "./LoadData";
import { useState } from "react";
import MapObservations from "./observations/MapObservations";
import MapDosing from "./dosing/MapDosing";
import PreviewData from "./PreviewData";
import { RootState } from "../../app/store";
import { DatasetRead, useDatasetCsvUpdateMutation } from "../../app/backendApi";
import Stratification from "./stratification/Stratification";
import useDataset from "../../hooks/useDataset";
import {
  normaliseHeader,
  parsePerKgDoses,
  removeIgnoredObservations,
  validateDataRow,
} from "./dataValidation";
import { Tooltip } from "@mui/material";
import {
  IProtocol,
  getSubjectDoses,
  getProtocols,
} from "./stratification/protocolUtils";
import { Notifications } from "./Notifications";
import {
  CHANGE_STYLING_INNER_HEIGHT_LIMIT,
  LOAD_STEPPER_MAIN_CONTENT_HEIGHT,
} from "../../shared/calculateTableHeights";

interface IStepper {
  csv: string;
  onCancel: () => void;
  onFinish: () => void;
}

const stepLabels = [
  "Upload Data",
  "Stratification",
  "Map Dosing",
  "Map Observations",
  "Preview Dataset",
];
const stepComponents = [
  LoadData,
  Stratification,
  MapDosing,
  MapObservations,
  PreviewData,
];

type Row = { [key: string]: string };
type Data = Row[];
type Field = string;

export type StepperState = {
  fileName: string;
  fields: Field[];
  normalisedHeaders: Field[];
  normalisedFields: Map<Field, string>;
  data: Data;
  errors: string[];
  warnings: string[];
  timeUnit?: string;
  amountUnit?: string;
  groupColumn: string;
  hasDosingRows: boolean;
};

function validateSubjectProtocols(protocols: IProtocol[]) {
  const subjectMemberships: Record<string, string[]> = {};
  protocols.forEach((protocol) => {
    protocol.subjects.forEach((subject) => {
      const subjectProtocols: string[] = subjectMemberships[subject]
        ? [...subjectMemberships[subject], protocol.label]
        : [protocol.label];
      subjectMemberships[subject] = subjectProtocols;
    });
  });
  return Object.values(subjectMemberships).every(
    (protocols) => protocols.length === 1,
  );
}

const LoadDataStepper: FC<IStepper> = ({ csv = "", onCancel, onFinish }) => {
  const csvData = Papa.parse(csv, { header: true });
  const csvFields = csvData.meta.fields || [];
  const [data, setData] = useState<Data>((csvData.data as Data) || []);
  const [errors, setErrors] = useState<string[]>([]);
  let displayedErrors = [...errors];
  const [warnings, setWarnings] = useState<string[]>([]);
  const [normalisedFields, setNormalisedFields] = useState<Map<Field, string>>(
    new Map(csvFields.map(normaliseHeader)),
  );
  const [timeUnit, setTimeUnit] = useState<string | undefined>(undefined);
  const [amountUnit, setAmountUnit] = useState<string | undefined>(undefined);
  const [groupColumn, setGroupColumn] = useState("Group");
  const [hasDosingRows, setHasDosingRows] = useState(false);
  const selectedProject = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const [updateDatasetCsv] = useDatasetCsvUpdateMutation();
  const { dataset, updateDataset } = useDataset(selectedProject);
  const [fileName, setFileName] = useState<string>(
    dataset?.name || "New Dataset",
  );
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const onNotificationsOpenChange = () =>
    setIsNotificationsOpen(!isNotificationsOpen);

  const state = {
    get fileName() {
      return fileName;
    },
    set fileName(newFileName: string) {
      setFileName(newFileName);
    },
    get normalisedFields() {
      return normalisedFields;
    },
    set normalisedFields(newNormalisedFields: Map<Field, string>) {
      setNormalisedFields(newNormalisedFields);
    },
    get data() {
      return data;
    },
    set data(newData: Data) {
      setData(newData);
    },
    get errors() {
      return errors;
    },
    set errors(newErrors: string[]) {
      setErrors(newErrors);
    },
    get warnings() {
      return warnings;
    },
    set warnings(newWarnings: string[]) {
      setWarnings(newWarnings);
    },
    get timeUnit() {
      return timeUnit;
    },
    set timeUnit(newTimeUnit: string | undefined) {
      setTimeUnit(newTimeUnit);
    },
    get amountUnit() {
      return amountUnit;
    },
    set amountUnit(newAmountUnit: string | undefined) {
      setAmountUnit(newAmountUnit);
    },
    get groupColumn() {
      return groupColumn;
    },
    set groupColumn(newGroupColumn: string) {
      setGroupColumn(newGroupColumn);
    },
    get hasDosingRows() {
      return hasDosingRows;
    },
    set hasDosingRows(newHasDosingRows: boolean) {
      setHasDosingRows(newHasDosingRows);
    },
    get fields() {
      return [...normalisedFields.keys()];
    },
    get normalisedHeaders() {
      return [...normalisedFields.values()];
    },
  };
  parsePerKgDoses(state);
  const subjectDoses = getSubjectDoses(state);
  const protocols = getProtocols(subjectDoses);
  const areValidProtocols = validateSubjectProtocols(protocols);
  const protocolErrorMessage =
    "Invalid data file. Each subject ID can only belong to one dosing protocol.";

  if (!areValidProtocols && !errors.includes(protocolErrorMessage)) {
    displayedErrors = [...displayedErrors, protocolErrorMessage];
  }

  const [stepState, setStepState] = useState({ activeStep: 0, maxStep: 0 });
  const [hasTimeUnitChanged, setHasTimeUnitChanged] = useState<boolean>(false);
  const StepComponent = stepComponents[stepState.activeStep];
  const isFinished = stepState.activeStep === stepLabels.length;
  const normalisedHeaders = [...normalisedFields.values()];
  if (
    data.length > 0 &&
    !normalisedHeaders.includes("Time Unit") &&
    !timeUnit
  ) {
    displayedErrors = [...displayedErrors, "Time unit is not defined."];
  }

  const noTimeUnit = !state.normalisedHeaders.find(
    (field) => field === "Time Unit",
  );
  const invalidTimeUnits = state.errors.find((error) =>
    error.includes("file contains multiple time units"),
  );
  const showTimeUnitSelector = noTimeUnit || invalidTimeUnits;
  const showData = state.data.length > 0 && state.fields.length > 0;
  const shouldShowTimeUnitNotification =
    showTimeUnitSelector || hasTimeUnitChanged;
  const notificationsCount =
    displayedErrors?.length +
    warnings?.length +
    (shouldShowTimeUnitNotification ? 2 : 1);

  const handleStep = (step: number) => () => {
    setStepState((prevActiveStep) => ({
      ...prevActiveStep,
      activeStep: step,
      maxStep: Math.max(prevActiveStep.maxStep, step + 1),
    }));
  };
  const handleNext = () => {
    setStepState((prevActiveStep) => ({
      activeStep: prevActiveStep.activeStep + 1,
      maxStep: Math.max(prevActiveStep.maxStep, prevActiveStep.activeStep + 1),
    }));
  };

  const handleBack = () => {
    setStepState((prevActiveStep) => ({
      ...prevActiveStep,
      activeStep: prevActiveStep.activeStep - 1,
    }));
  };

  const restart = () => {
    setStepState((prevActiveStep) => ({
      ...prevActiveStep,
      activeStep: 0,
    }));
  };

  const handleFinish = async () => {
    handleNext();
    if (dataset?.id) {
      try {
        const dataToUpload = data
          .map((row) => {
            const newRow: Record<string, string> = {};
            Object.keys(row).forEach((field) => {
              if (normalisedFields.get(field) !== "Ignore") {
                newRow[field] = row[field];
              }
            });
            return newRow;
          })
          .filter((row) => validateDataRow(row, normalisedFields))
          .map((row) => removeIgnoredObservations(row, normalisedFields));
        const columns = [...normalisedFields.keys()].filter(
          (field) => normalisedFields.get(field) !== "Ignore",
        );
        const csv = Papa.unparse(dataToUpload, { columns });
        const response = await updateDatasetCsv({
          id: dataset.id,
          datasetCsv: {
            name: fileName,
            csv,
          },
        });
        if (!("error" in response)) {
          updateDataset(response.data as unknown as DatasetRead);
          onFinish();
        } else {
          const { data, error, originalStatus } = response.error as {
            data: { csv: string[] };
            error?: string;
            originalStatus?: number;
          };
          if (data.csv) {
            setErrors(data.csv);
            restart();
            return false;
          }
          if (error) {
            setErrors([`${originalStatus}: ${error}`]);
            restart();
            return false;
          }
          setErrors(["Unknown error saving CSV"]);
          restart();
          return false;
        }
      } catch (e) {
        console.error(e);
        const { message } = e as Error;
        setErrors([message]);
        restart();
      }
    }
  };

  const onResetDataset = () => {
    if (window.confirm("Any unsaved changes will be lost. Continue?")) {
      setData([]);
      setErrors([]);
      setWarnings([]);
      setTimeUnit(undefined);
      setAmountUnit(undefined);
      setGroupColumn("Group");
      setFileName("New Dataset");
      setHasTimeUnitChanged(false);
      restart();
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: LOAD_STEPPER_MAIN_CONTENT_HEIGHT,
        width: "100%",
      }}
    >
      <Stepper nonLinear activeStep={stepState.activeStep}>
        {stepLabels.map((step, index) => (
          <Step key={index}>
            <StepButton
              onClick={handleStep(index)}
              disabled={
                data.length === 0 || isFinished || displayedErrors.length > 0
              }
            >
              {step}
            </StepButton>
          </Step>
        ))}
      </Stepper>
      <Notifications
        isOpen={isNotificationsOpen}
        showData={showData}
        errors={displayedErrors}
        warnings={warnings}
        fileName={fileName}
        state={state}
        firstTime={stepState.activeStep === stepState.maxStep}
        handleOpen={onNotificationsOpenChange}
        setHasTimeUnitChanged={setHasTimeUnitChanged}
        showTimeUnitSelector={Boolean(shouldShowTimeUnitNotification)}
      />
      <Box
        sx={{
          flexGrow: 1,
          maxHeight: "80vh",
          overflowX:
            window.innerHeight > CHANGE_STYLING_INNER_HEIGHT_LIMIT
              ? "none"
              : "auto",
        }}
      >
        {isFinished ? (
          <Typography>Saving data…</Typography>
        ) : (
          <StepComponent
            state={state}
            firstTime={stepState.activeStep === stepState.maxStep}
            notificationsInfo={{
              isOpen: isNotificationsOpen,
              count: notificationsCount,
            }}
          />
        )}
      </Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 1,
          paddingBottom: 1,
        }}
      >
        <Tooltip
          title="You can cancel and upload new file"
          placement="top"
          arrow
        >
          <Button variant="outlined" onClick={csv ? onCancel : onResetDataset}>
            Cancel
          </Button>
        </Tooltip>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <Button
            variant="outlined"
            onClick={handleBack}
            disabled={stepState.activeStep === 0}
          >
            Previous
          </Button>
          <Button
            sx={{
              marginLeft: "1rem",
            }}
            variant="contained"
            disabled={data.length === 0 || isFinished || errors.length > 0}
            color="primary"
            onClick={
              stepState.activeStep === stepLabels.length - 1
                ? handleFinish
                : handleNext
            }
          >
            {stepState.activeStep === stepLabels.length - 1 ? "Finish" : "Next"}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default LoadDataStepper;
