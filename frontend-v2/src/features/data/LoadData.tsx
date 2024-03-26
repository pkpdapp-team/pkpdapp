import { Alert, Box, Stack, Typography } from '@mui/material';
import Papa from 'papaparse'
import { FC, useCallback, useState} from 'react'
import {useDropzone} from 'react-dropzone'
import MapHeaders from './MapHeaders';
import { manditoryHeaders, normaliseHeader } from './normaliseDataHeaders';
import { StepperState } from './LoadDataStepper';
import SetUnits from './SetUnits';

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

const validateNormalisedFields = (fields: Field[]) => {
  const errors: string[] = [];
  // check for mandatory fields
  for (const field of manditoryHeaders) {
    if (!fields.includes(field)) {
      errors.push(`${field} has not been defined`);
    }
  }
  return errors;
}

const LoadData: FC<ILoadDataProps> = ({state, firstTime}) => {
  const [errors, setErrors] = useState<string[]>(firstTime ? [] : validateNormalisedFields(state.normalisedFields));
  const [showData, setShowData] = useState<boolean>(state.data.length > 0 && state.fields.length > 0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      const reader = new FileReader()

      reader.onabort = () => setErrors(['file reading was aborted'])
      reader.onerror = () => setErrors(['file reading has failed'])
      reader.onload = () => {
        // Parse the CSV data
        const rawCsv = reader.result as string;
        const csvData = Papa.parse(rawCsv.trim(), { header: true });
        const fields = csvData.meta.fields || [];
        const normalisedFields = fields.map(normaliseHeader);
        const errors = csvData.errors.map((e) => e.message).concat(validateNormalisedFields(normalisedFields));
        state.setData(csvData.data as Data);
        state.setFields(fields);
        state.setNormalisedFields(normalisedFields)
        setErrors(errors);
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
    setErrors(validateNormalisedFields(fields));
  }
  

  return (
    <Stack spacing={2}>
      <div style={style.dropAreaContainer}>
        <div {...getRootProps({style: style.dropArea})}>
          <input {...getInputProps()} />
          <p>Drag 'n' drop some files here, or click to select files</p>
        </div>
      </div>
      <Box sx={{ width: '100%', maxHeight: "24vh", overflow: 'auto', whiteSpace: 'nowrap'}}>
        {errors.map((error, index) => (
          <Alert severity="error" key={index}>
            <Typography>{error}</Typography>
          </Alert>
        ))}
        {showData && 
          <Alert severity="error">
            <SetUnits state={state} firstTime={firstTime} />
          </Alert>
        } 
      </Box>
      <Box component="div" sx={{ maxHeight: "40vh", overflow: 'auto', overflowX: 'auto' }}>
        {showData && <MapHeaders data={state.data} fields={state.fields} setNormalisedFields={setNormalisedFields} normalisedFields={state.normalisedFields}/>}
      </Box>
    </Stack>
  )
}

export default LoadData;