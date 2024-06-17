import { FC } from "react";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Select,
  FormControl,
  ListSubheader,
  MenuItem,
  InputLabel,
  Typography,
  Menu,
} from "@mui/material";
import { Data, Field } from "./LoadData";
import { groupedHeaders } from "./normaliseDataHeaders";

interface IMapHeaders {
  data: Data;
  fields: Field[];
  normalisedFields: Field[];
  setNormalisedFields: (fields: Field[]) => void;
}

const MapHeaders: FC<IMapHeaders> = ({
  data,
  fields,
  normalisedFields,
  setNormalisedFields,
}: IMapHeaders) => {
  const handleFieldChange = (index: number) => (event: any) => {
    const newFields = [...normalisedFields];
    newFields[index] = event.target.value;
    setNormalisedFields(newFields);
  };

  return (
    <Table>
      <TableHead>
        <TableRow>
          {fields.map((field, index) => (
            <TableCell key={index}>
              <Typography
                variant="h6"
                component="div"
                sx={{ flexGrow: 1, marginBottom: 1 }}
                align="center"
              >
                {field}
              </Typography>
              <FormControl fullWidth>
                <InputLabel id={`select-${index}-label`}>
                  Column Type
                </InputLabel>
                <Select
                  labelId={`select-${index}-label`}
                  id={`select-${index}`}
                  value={normalisedFields[index]}
                  label="Column Type"
                  onChange={handleFieldChange(index)}
                >
                  {Object.entries(groupedHeaders).map(([group, headers]) => [
                    <ListSubheader key={group}>{group}</ListSubheader>,
                    ...headers.map((header) => (
                      <MenuItem key={header} value={header}>
                        {header}
                      </MenuItem>
                    )),
                  ])}
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
  );
};

export default MapHeaders;
