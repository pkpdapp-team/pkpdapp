import { Box, Stack, Typography } from '@mui/material';
import Papa from 'papaparse'
import { FC, useCallback, useState} from 'react'
import {useDropzone} from 'react-dropzone'
import MapHeaders from './MapHeaders';
import { normaliseHeader, validateNormalisedFields } from './normaliseDataHeaders';
import { StepperState } from './LoadDataStepper';
import SetUnits from './SetUnits';
import { time } from 'console';

export type Row = {[key: string]: string};
export type Data = Row[];
export type Field = string;


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
    ':hover': {
      backgroundColor: "#f0f0f0"
    }
  },
  dropAreaContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  }
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
    const normalisedFields = newFields.map(normaliseHeader);
    state.setNormalisedFields(normalisedFields);
  }
}

/*
Add ID field if it doesn't exist.
Assume ascending time values for each subject.
*/
function createDefaultSubjects(state: StepperState) {
  let subjectCount = 1
  const timeFieldIndex = state.normalisedFields.indexOf('Time');
  const timeField = state.fields[timeFieldIndex];
  const newData = state.data.map((row, index) => {
    if (index > 0) {
      const time = parseFloat(row[timeField]);
      const prevTime = parseFloat(state.data[index - 1][timeField]);
      if (time < prevTime) {
        subjectCount++;
      }
    }
    return {...row, ID: `${subjectCount}`};
  });
  updateDataAndResetFields(state, newData);
}

function createDefaultSubjectGroup(state: StepperState) {
  const newData = [ ...state.data ];
  newData.forEach(row => {
    row['Group'] = '1';
  });
  updateDataAndResetFields(state, newData);
}

function setMinimumInfusionTime(state: StepperState) {
  const infusionTimeIndex = state.normalisedFields.indexOf('Infusion Duration');
  const infusionTimeField = state.fields[infusionTimeIndex];
  const hasZeroInfusionTIme = state.data.some(row => parseFloat(row[infusionTimeField]) === 0);
  if (hasZeroInfusionTIme) {
    const newData = [...state.data];
    newData.forEach(row => {
      const infusionTime = parseFloat(row[infusionTimeField]);
      row[infusionTimeField] = infusionTime === 0 ? '0.0833' : row[infusionTimeField];
    });
    state.setData(newData);
  }
}

const LoadData: FC<ILoadDataProps> = ({state, firstTime}) => {
  const [showData, setShowData] = useState<boolean>(state.data.length > 0 && state.fields.length > 0);
  if (!state.normalisedFields.includes('ID')) {
    createDefaultSubjects(state);
  }
  if (!state.normalisedFields.includes('Cat Covariate')) {
    createDefaultSubjectGroup(state);
  }
  if (state.normalisedFields.includes('Infusion Duration')) {
    setMinimumInfusionTime(state);
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    state.setTimeUnit('');
    state.setAmountUnit('');
    state.setErrors([]);
    state.setWarnings([]);
    acceptedFiles.forEach((file) => {
      const reader = new FileReader()

      reader.onabort = () => state.setErrors(['file reading was aborted'])
      reader.onerror = () => state.setErrors(['file reading has failed'])
      reader.onload = () => {
        state.setFileName(file.name);
        // Parse the CSV data
        const rawCsv = reader.result as string;
        const csvData = Papa.parse(rawCsv.trim(), { header: true });
        const fields = csvData.meta.fields || [];
        const normalisedFields = fields.map(normaliseHeader);
        const fieldValidation = validateNormalisedFields(normalisedFields);
        const primaryCohort = fields.find(
          (field, index) => normalisedFields[index] === 'Cat Covariate'
        ) || 'Group';
        const errors = csvData.errors
          .map((e) => e.message).concat(fieldValidation.errors);
        state.setData(csvData.data as Data);
        state.setFields(fields);
        state.setNormalisedFields(normalisedFields);
        state.setPrimaryCohort(primaryCohort);
        state.setErrors(errors);
        state.setWarnings(fieldValidation.warnings);
        if (csvData.data.length > 0 && csvData.meta.fields) {
          setShowData(true);
        }
      }
      reader.readAsText(file)
    })
    
  }, [state])
  const {getRootProps, getInputProps} = useDropzone({onDrop})

  const setNormalisedFields = (fields: Field[]) => {
    state.setNormalisedFields(fields);
    const { errors, warnings } = validateNormalisedFields(fields);
    state.setErrors(errors);
    state.setWarnings(warnings);
  }
  

  return (
    <Stack spacing={2}>
      <Box sx={{ width: '100%', maxHeight: "24vh", overflow: 'auto', whiteSpace: 'nowrap'}}>
        {showData && 
          <SetUnits state={state} firstTime={firstTime} />
        }
      </Box>
      <Box style={style.dropAreaContainer}>
        <Box {...getRootProps({style: style.dropArea})}>
          <input {...getInputProps()} />
          <Typography>Drag 'n' drop some files here, or click to select files</Typography>
        </Box>
      </Box>
      <Box component="div" sx={{ maxHeight: "40vh", overflow: 'auto', overflowX: 'auto' }}>
        {showData && <MapHeaders data={state.data} fields={state.fields} setNormalisedFields={setNormalisedFields} normalisedFields={state.normalisedFields}/>}
      </Box>
    </Stack>
  )
}

export default LoadData;