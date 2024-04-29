import { FC } from 'react';
import { useSelector } from "react-redux";
import Papa from 'papaparse'
import Box from '@mui/material/Box';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import LoadData from './LoadData';
import { useState } from 'react';
import MapObservations from './MapObservations';
import MapDosing from './MapDosing';
import PreviewData from './PreviewData';
import { RootState } from "../../app/store";
import { DatasetRead, useDatasetCsvUpdateMutation } from '../../app/backendApi';
import Stratification from './Stratification';
import useDataset from '../../hooks/useDataset';
import { normaliseHeader } from './normaliseDataHeaders';
import { Alert } from '@mui/material';

interface IStepper {
  csv: string,
  onCancel: () => void,
  onFinish: () => void
}

const stepLabels = ['Upload Data', 'Stratification', 'Map Dosing', 'Map Observations', 'Preview Dataset'];
const stepComponents = [LoadData, Stratification, MapDosing, MapObservations, PreviewData];

type Row = { [key: string]: string };
type Data = Row[];
type Field = string;

export type StepperState = {
  fileName: string;
  fields: Field[];
  normalisedFields: Field[];
  data: Data;
  errors: string[];
  warnings: string[];
  timeUnit?: string;
  setTimeUnit: (timeUnit: string) => void;
  setFileName: (fileName: string) => void;
  setFields: (fields: Field[]) => void;
  setNormalisedFields: (fields: Field[]) => void;
  setData: (data: Data) => void;
  setErrors: (errors: string[]) => void;
  setWarnings: (warnings: string[]) => void;
  amountUnit?: string;
  setAmountUnit: (amountUnit: string) => void;
}

const LoadDataStepper: FC<IStepper> = ({ csv = '', onCancel, onFinish }) => {
  const csvData = Papa.parse(csv, { header: true });
  const [fileName, setFileName] = useState<string>('');
  const [data, setData] = useState<Data>(csvData.data as Data || []);
  let [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [fields, setFields] = useState<string[]>(csvData.meta.fields || []);
  const [normalisedFields, setNormalisedFields] = useState<string[]>(fields.map(normaliseHeader));
  const [timeUnit, setTimeUnit] = useState<string | undefined>(undefined);
  const [amountUnit, setAmountUnit] = useState<string | undefined>(undefined);
  const selectedProject = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const [
    updateDatasetCsv
  ] = useDatasetCsvUpdateMutation();
  const { dataset, updateDataset } = useDataset(selectedProject);

  const state = {
    fileName,
    fields,
    normalisedFields,
    data,
    errors,
    warnings,
    setErrors,
    setWarnings,
    setFileName,
    setFields,
    setNormalisedFields,
    setData,
    timeUnit,
    setTimeUnit,
    amountUnit,
    setAmountUnit
  };

  const [stepState, setStepState] = useState({ activeStep: 0, maxStep: 0 });
  const StepComponent = stepComponents[stepState.activeStep];
  const isFinished = stepState.activeStep === stepLabels.length;
  if (
    data.length > 0 &&
    !normalisedFields.includes('Time Unit') &&
    !timeUnit
  ) {
    errors = [...errors, 'Time unit is not defined.']
  }

  const handleNext = () => {
    setStepState((prevActiveStep) => ({
      activeStep: prevActiveStep.activeStep + 1,
      maxStep: Math.max(prevActiveStep.maxStep, prevActiveStep.activeStep + 1)
    }));
  };

  const handleBack = () => {
    setStepState((prevActiveStep) => ({ ...prevActiveStep, activeStep: prevActiveStep.activeStep - 1 }));
  };

  const handleFinish = async () => {
    handleNext();
    if (dataset?.id) {
      try {
        const csv = Papa.unparse(data);
        const response = await updateDatasetCsv({
          id: dataset.id,
          datasetCsv: {
            csv
          }
        });
        if (!('error' in response)) {
          updateDataset(response.data as unknown as DatasetRead);
          onFinish();
        } else {
          const { data } = response.error as { data: { csv: string[] } };
          setErrors(data.csv);
        }
      } catch (e) {
        console.error(e);
        const { message } = e as Error;
        setErrors([message])
      }
    }
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Stepper activeStep={stepState.activeStep} alternativeLabel>
        {stepLabels.map((step, index) => (
          <Step key={index}>
            <StepLabel>{step}</StepLabel>
          </Step>
        ))}
      </Stepper>
      <Box sx={{ minHeight: '60vh' }} >
        {state.fileName &&
          <Box padding={1} sx={{ display: 'flex', justifyContent: 'center' }}>
            <Typography sx={{ fontWeight: 'bold' }}>File: {state.fileName}</Typography>
          </Box>
        }
        {errors.map(error => <Alert key={error} severity="error">{error}</Alert>)}
        {warnings.map(warning => <Alert key={warning} severity="warning">{warning}</Alert>)}
        {isFinished ?
          <Typography>'The process is completed'</Typography> :
          <StepComponent state={state} firstTime={stepState.activeStep === stepState.maxStep} />
        }
      </Box>
      <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 1
          }}
        >
          {stepState.activeStep === 0 ?
            <Button onClick={onCancel}>Cancel</Button> :
            <Button onClick={handleBack}>Back</Button>
          }
          <Button
            disabled={data.length === 0 || isFinished || errors.length > 0}
            variant="contained"
            color="primary"
            onClick={stepState.activeStep === stepLabels.length - 1 ? handleFinish : handleNext}
          >
            {stepState.activeStep === stepLabels.length - 1 ? 'Finish' : 'Next'}
          </Button>
        </Box>
    </Box>
  );
}

export default LoadDataStepper;