import { FC, useMemo } from "react";
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
  TablePagination,
  TableContainer,
} from "@mui/material";
import { Data, Field } from "./LoadData";
import { groupedHeaders } from "./dataValidation";
import { usePagination } from "../../hooks/usePagination";

interface IMapHeaders {
  data: Data;
  normalisedFields: Map<Field, string>;
  setNormalisedFields: (fields: Map<Field, string>) => void;
  notificationsInfo: {
    isOpen: boolean;
    count: number;
  }
}

const MapHeaders: FC<IMapHeaders> = ({
  data,
  normalisedFields,
  setNormalisedFields,
  notificationsInfo
}: IMapHeaders) => {
  const {
    page,
    rowsPerPage,
    rowsPerPageOptions,
    handleChangeRowsPerPage,
    handlePageChange,
  } = usePagination();
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

  const visibleRows = useMemo(
    () => [...data].slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [page, rowsPerPage, data],
  );

  return (
    <>
      <TableContainer
        sx={{
          overflow: "auto",
          maxHeight: notificationsInfo?.isOpen ? `calc(55vh - ${notificationsInfo?.count * 3}rem)` : '55vh',
          transition: 'all .35s ease-in'
        }}
      >
        <Table stickyHeader size="small">
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
                      {Object.entries(groupedHeaders).map(
                        ([group, headers]) => [
                          <ListSubheader key={group}>{group}</ListSubheader>,
                          ...headers.map((header) => (
                            <MenuItem key={header} value={header}>
                              {header}
                            </MenuItem>
                          )),
                        ],
                      )}
                    </Select>
                  </FormControl>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleRows.map((row, index) => (
              <TableRow key={index}>
                {fields.map((field, index) => (
                  <TableCell key={index}>{row[field]}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={rowsPerPageOptions}
        component="div"
        count={data?.length || 0}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleChangeRowsPerPage}
        sx={{ display: 'flex', justifyContent: 'center', flexShrink: '0'}}
      />
    </>
  );
};

export default MapHeaders;
