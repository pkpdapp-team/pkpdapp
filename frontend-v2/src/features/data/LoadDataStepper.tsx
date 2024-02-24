import * as React from 'react';
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

const stepLabels = ['Upload Data', 'Map Dosing', 'Map Observations'];
const stepComponents = [LoadData, MapDosing, MapObservations];

type Row = {[key: string]: string};
type Data = Row[];
type Field = string;

export type StepperState = {
  fields: Field[];
  normalisedFields: Field[];
  data: Data;
  timeUnit?: string;
  setTimeUnit: (timeUnit: string) => void;
  setFields: (fields: Field[]) => void;
  setNormalisedFields: (fields: Field[]) => void;
  setData: (data: Data) => void;
  amountUnit?: string;
  setAmountUnit: (amountUnit: string) => void;
}

const LoadDataStepper: React.FC = () => {
  const [data, setData] = useState<Data>([]);
  const [fields, setFields] = useState<string[]>([]);
  const [normalisedFields, setNormalisedFields] = useState<string[]>([]);
  const [timeUnit, setTimeUnit] = useState<string | undefined>(undefined);
  const [amountUnit, setAmountUnit] = useState<string | undefined>(undefined);

  const state = {
    fields,
    normalisedFields,
    data,
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

  const handleNext = () => {
    setStepState((prevActiveStep) => ({ 
      activeStep: prevActiveStep.activeStep + 1, 
      maxStep: Math.max(prevActiveStep.maxStep, prevActiveStep.activeStep + 1)
    }));
  };

  const handleBack = () => {
    setStepState((prevActiveStep) => ({ ...prevActiveStep, activeStep: prevActiveStep.activeStep - 1 }));
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Stepper activeStep={stepState.activeStep} alternativeLabel>
        {stepLabels.map((step, index) => (
          <Step key={index}>
            <StepLabel>{step}</StepLabel>
          </Step>
        ))}
      </Stepper>
      <Typography>
        {isFinished ? 
          'The process is completed' :
          <StepComponent state={state} firstTime={stepState.activeStep === stepState.maxStep}/>
        }
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', marginTop: 1 }}>
        <Button disabled={stepState.activeStep === 0} onClick={handleBack}>Back</Button>
        <Button disabled={isFinished} variant="contained" color="primary" onClick={handleNext}>
          {stepState.activeStep === stepLabels.length - 1 ? 'Finish' : 'Next'}
        </Button>
      </Box>
    </Box>
  );
}

export default LoadDataStepper;