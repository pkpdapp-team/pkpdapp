import { FC } from 'react';
import {
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

const CreateDosingProtocols: FC<IDosingProtocols> = ({
  administrationIdField,
  amountUnitField = 'Amount Unit',
  amountUnit,
  state,
  units,
  variables
}: IDosingProtocols) => {
  const amountField = state.fields.find(
    (field, i) => state.normalisedFields[i] === 'Amount'
  );
  if (!amountField) {
    const newFields = [...state.fields, 'Amount'];
    const newNormalisedFields = [...state.normalisedFields, 'Amount'];
    const newData = state.data.map(row => ({ ...row, 'Amount': '.' }));
    state.setFields(newFields);
    state.setNormalisedFields(newNormalisedFields);
    state.setData(newData);
  }
  const administrationIds = administrationIdField ?
    state.data.map(row => row[administrationIdField]) :
    [];
  const uniqueAdministrationIds = [...new Set(administrationIds)];


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
        row['Amount Variable'] = value;
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
      <p>
        Map dosing compartments to your subject groups here.
        You can set dose amounts and intervals under Trial Design, once you have uploaded your data.
      </p>
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
              const currentRow = state.data.find(row => administrationIdField ? row[administrationIdField] === adminId : true);
              const selectedVariable = variables?.find(variable => variable.qname === currentRow?.['Amount Variable']);
              const compatibleUnits = units?.find(unit => unit.id === selectedVariable?.unit)?.compatible_units;
              const adminUnit = amountUnitField && currentRow && currentRow[amountUnitField];
              return (
                <TableRow>
                  <TableCell>
                    {adminId}
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
                    {adminUnit ?
                      adminUnit :
                      <FormControl fullWidth>
                        <InputLabel id={`select-unit-${adminId}-label`}>Units</InputLabel>
                        <Select
                          labelId={`select-unit-${adminId}-label`}
                          id={`select-unit-${adminId}`}
                          label='Units'
                          value={currentRow?.[amountUnitField || 'Amt_unit']}
                          onChange={handleAmountUnitChange(adminId)}
                        >
                          {compatibleUnits?.map((unit) => (
                            <MenuItem key={unit.symbol} value={unit.symbol}>{unit.symbol}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    }
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

export default CreateDosingProtocols;