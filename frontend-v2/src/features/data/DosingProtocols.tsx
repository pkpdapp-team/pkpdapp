import { FC } from 'react';
import {
  Alert,
  Box,
  Select,
  FormControl,
  MenuItem,
  InputLabel,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Typography,
  SelectChangeEvent
} from "@mui/material";
import { StepperState } from "./LoadDataStepper";
import {
  UnitRead,
  VariableRead
} from "../../app/backendApi";

interface IDosingProtocols {
  administrationIdField: string;
  amountUnitField?: string;
  amountUnit?: UnitRead;
  state: StepperState;
  units: UnitRead[];
  variables: VariableRead[];
}

const DosingProtocols: FC<IDosingProtocols> = ({
  administrationIdField,
  amountUnitField,
  amountUnit,
  state,
  units,
  variables
}: IDosingProtocols) => {
  const amountField = state.fields.find(
    (field, i) => state.normalisedFields[i] === 'Amount'
  );
  const amountVariableField = state.fields.find(
    (field, i) => state.normalisedFields[i] === 'Amount Variable'
  );
  const dosingRows = amountField ? state.data.filter(row => row[amountField] && row[amountField] !== '.') : [];
  const administrationIds = administrationIdField ?
    dosingRows.map(row => row[administrationIdField]) :
    [];
  const uniqueAdministrationIds = [...new Set(administrationIds)];
  const routeField = state.fields.find(field => field.toLowerCase() === 'route');

  const isAmount = (variable: VariableRead) => {
    const amountUnits = units?.find(
      (unit) => unit.symbol === amountUnit?.symbol,
    )?.compatible_units;
    const variableUnit = units?.find((unit) => unit.id === variable.unit);
    return variableUnit?.symbol !== "" &&
      amountUnits?.find(
        (unit) => parseInt(unit.id) === variable.unit,
      ) !== undefined;
  }
  const modelAmounts = variables?.filter(isAmount) || [];

  const handleAmountMappingChange = (id: string) => (event: SelectChangeEvent) => {
    const nextData = [...state.data];
    const { value } = event.target;
    nextData.filter(row => administrationIdField ? row[administrationIdField] === id : true)
      .forEach(row => {
        row[amountVariableField || 'Amount Variable'] = value;
      })
    state.setData(nextData);
  }
  const handleAmountUnitChange = (id: string) => (event: SelectChangeEvent) => {
    const nextData = [...state.data];
    const { value } = event.target;
    nextData.filter(row => administrationIdField ? row[administrationIdField] === id : true)
      .forEach(row => {
        row[amountUnitField || 'Amt_unit'] = value;
      })
    state.setData(nextData);
  }
  return (
    <>
      <Alert severity="info">
        Set a dosing compartment and unit for each of your subject groups here.
      </Alert>
      <Box component="div" sx={{ maxHeight: "40vh", overflow: 'auto', overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <Typography>
                  {administrationIdField}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography>
                  Amount
                </Typography>
              </TableCell>
              <TableCell>
                <Typography>
                  Route
                </Typography>
              </TableCell>
              <TableCell>
                <Typography>
                  Dosing Compartment
                </Typography>
              </TableCell>
              <TableCell>
                <Typography>
                  Unit
                </Typography>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {uniqueAdministrationIds.map((adminId, index) => {
              const currentRow = dosingRows.find(row => administrationIdField ? row[administrationIdField] === adminId : true);
              const selectedVariable = variables?.find(variable => variable.qname === currentRow?.[amountVariableField || 'Amount Variable']);
              const compatibleUnits = units?.find(unit => unit.id === selectedVariable?.unit)?.compatible_units;
              const adminUnit = amountUnitField && currentRow && currentRow[amountUnitField];
              const amount = amountField && currentRow?.[amountField];
              const route = routeField && currentRow?.[routeField];
              return (
                <TableRow key={adminId}>
                  <TableCell>
                    {adminId}
                  </TableCell>
                  <TableCell>
                    <Typography>
                      {amount}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography>
                      {route}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <FormControl fullWidth>
                      <InputLabel id={`select-var-${adminId}-label`}>Variable</InputLabel>
                      <Select
                        labelId={`select-var-${adminId}-label`}
                        id={`select-var-${adminId}`}
                        label='Variable'
                        value={selectedVariable?.qname}
                        onChange={handleAmountMappingChange(adminId)}
                      >
                        {modelAmounts?.map((variable) => (
                          <MenuItem key={variable.name} value={variable.qname}>{variable.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>
                    <FormControl fullWidth>
                      <InputLabel id={`select-unit-${adminId}-label`}>Units</InputLabel>
                      <Select
                        labelId={`select-unit-${adminId}-label`}
                        id={`select-unit-${adminId}`}
                        label='Units'
                        value={adminUnit}
                        onChange={handleAmountUnitChange(adminId)}
                      >
                        {compatibleUnits?.map((unit) => (
                          <MenuItem key={unit.symbol} value={unit.symbol}>{unit.symbol}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Box>
    </>
  )
}

export default DosingProtocols;

