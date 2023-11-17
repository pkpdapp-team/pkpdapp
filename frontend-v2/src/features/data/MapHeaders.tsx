import { TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Select, FormControl, MenuItem, InputLabel, Typography } from "@mui/material";
import LoadData, { Data, Field } from "./LoadData";
import { normalisedHeaders } from "./normaliseDataHeaders";

interface IMapHeaders {
  data: Data;
  fields: Field[];
  normalisedFields: Field[];
  setNormalisedFields: (fields: Field[]) => void;
}

const MapHeaders: React.FC<IMapHeaders> = ({data, fields, normalisedFields, setNormalisedFields}: IMapHeaders) => {

  const normalisedHeadersOptions = normalisedHeaders.map((header) => ({value: header, label: header}));
  
  const handleFieldChange = (index: number) => (event: any) => {
    const newFields = [...normalisedFields];
    newFields[index] = event.target.value;
    setNormalisedFields(newFields);
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          {fields.map((field, index) => (
            <TableCell key={index}>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1, marginBottom: 1 }} align="center">
                {field}
              </Typography>
              <FormControl fullWidth>
                <InputLabel id={`select-${index}-label`}>Column Type</InputLabel>
                <Select
                  labelId={`select-${index}-label`}
                  id={`select-${index}`}
                  value={normalisedFields[index]}
                  label="Column Type"
                  onChange={handleFieldChange(index)}
                >
                  {normalisedHeadersOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {data.map((row, index) => (
          <TableRow key={index}>
            {fields.map((field, index) => (
              <TableCell key={index}>{row[field]}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default MapHeaders;