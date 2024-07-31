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
} from "@mui/material";
import { Data, Field } from "./LoadData";
import { groupedHeaders } from "./dataValidation";

interface IMapHeaders {
  data: Data;
  normalisedFields: Map<Field, string>;
  setNormalisedFields: (fields: Map<Field, string>) => void;
}

const MapHeaders: FC<IMapHeaders> = ({
  data,
  normalisedFields,
  setNormalisedFields,
}: IMapHeaders) => {
  const fields = [...normalisedFields.keys()];
  const handleFieldChange = (field: string) => (event: any) => {
    const newFields = new Map([
      ...normalisedFields.entries(),
      [field, event.target.value],
    ]);
    // there can only be one ID column
    if (event.target.value === "ID" && field !== "ID") {
      newFields.set("ID", "Ignore");
    }
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
                  value={normalisedFields.get(field)}
                  label="Column Type"
                  onChange={handleFieldChange(field)}
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
