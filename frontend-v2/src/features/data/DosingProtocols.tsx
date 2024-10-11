import { FC } from "react";
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
  SelectChangeEvent,
  TableContainer,
} from "@mui/material";
import { StepperState } from "./LoadDataStepper";
import { UnitRead, VariableRead } from "../../app/backendApi";
import { validateState } from "./dataValidation";
import { Row } from "./LoadData";

interface IDosingProtocols {
  administrationIdField: string;
  amountUnitField?: string;
  amountUnit?: UnitRead;
  state: StepperState;
  units: UnitRead[];
  variables: VariableRead[];
  notificationsInfo: {
    isOpen: boolean;
    count: number;
  };
}

const DosingProtocols: FC<IDosingProtocols> = ({
  administrationIdField,
  amountUnitField = "Amount Unit",
  amountUnit,
  state,
  units,
  variables,
  notificationsInfo
}: IDosingProtocols) => {
  const amountField =
    state.fields.find(
      (field) => state.normalisedFields.get(field) === "Amount",
    ) || "Amount";
  const amountVariableField =
    state.fields.find(
      (field) => state.normalisedFields.get(field) === "Amount Variable",
    ) || "Amount Variable";
  const dosingRows: Row[] = amountField
    ? state.data.filter(
        (row) =>
          (row[amountField] && row[amountField] !== ".") ||
          parseInt(row[administrationIdField]),
      )
    : state.data.filter((row) => parseInt(row[administrationIdField]));
  const administrationIds = administrationIdField
    ? dosingRows.map((row) => row[administrationIdField])
    : [];
  const uniqueAdministrationIds = [...new Set(administrationIds)];
  const routeField =
    state.fields.find(
      (field) => state.normalisedFields.get(field) === "Administration Name",
    ) || "Administration Name";

  const isAmount = (variable: VariableRead) => {
    const amountUnits = units?.find(
      (unit) => unit.symbol === amountUnit?.symbol,
    )?.compatible_units;
    const variableUnit = units?.find((unit) => unit.id === variable.unit);
    return (
      variableUnit?.symbol !== "" &&
      amountUnits?.find((unit) => parseInt(unit.id) === variable.unit) !==
        undefined
    );
  };
  const modelAmounts = variables?.filter(isAmount) || [];

  const handleAmountMappingChange =
    (id: string) => (event: SelectChangeEvent) => {
      const nextData = [...state.data];
      const { value } = event.target;
      nextData
        .filter((row) =>
          administrationIdField ? row[administrationIdField] === id : true,
        )
        .forEach((row) => {
          row[amountVariableField] = value;
        });
      state.setData(nextData);
      state.setNormalisedFields(
        new Map([
          ...state.normalisedFields.entries(),
          [amountVariableField, "Amount Variable"],
        ]),
      );
    };
  const handleAmountUnitChange = (id: string) => (event: SelectChangeEvent) => {
    const nextData = [...state.data];
    const { value } = event.target;
    nextData
      .filter((row) =>
        administrationIdField ? row[administrationIdField] === id : true,
      )
      .forEach((row) => {
        row[amountUnitField] = value;
      });
    const newNormalisedFields = new Map([
      ...state.normalisedFields.entries(),
      [amountUnitField, "Amount Unit"],
    ]);
    state.setData(nextData);
    state.setNormalisedFields(newNormalisedFields);
    const { errors, warnings } = validateState({
      ...state,
      data: nextData,
      normalisedFields: newNormalisedFields,
    });
    state.setErrors(errors);
    state.setWarnings(warnings);
  };

  return (
    <>
      <Box component="div">
        <Typography variant="h5">Dosing</Typography>
        <Typography variant="body2" style={{ marginTop: ".5rem", marginBottom: '.5rem' }}>
          Set a dosing compartment and unit for each of your subject groups
          here.
        </Typography>
        <TableContainer
          sx={{
            maxHeight: notificationsInfo?.isOpen
              ? `calc(60vh - ${notificationsInfo?.count * 3}rem)`
              : "60vh",
            transition: "all .35s ease-in",
          }}
        >
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>
                  <Typography>{administrationIdField}</Typography>
                </TableCell>
                <TableCell>
                  <Typography>Amount</Typography>
                </TableCell>
                <TableCell>
                  <Typography>Route</Typography>
                </TableCell>
                <TableCell>
                  <Typography>Dosing Compartment</Typography>
                </TableCell>
                <TableCell>
                  <Typography>Unit</Typography>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {uniqueAdministrationIds.map((adminId) => {
                const currentRow = dosingRows.find((row) =>
                  administrationIdField
                    ? row[administrationIdField] === adminId
                    : true,
                );
                const selectedVariable = variables?.find(
                  (variable) =>
                    variable.qname ===
                    currentRow?.[amountVariableField || "Amount Variable"],
                );
                const compatibleUnits = units?.find(
                  (unit) => unit.id === selectedVariable?.unit,
                )?.compatible_units;
                const adminUnit =
                  amountUnitField && currentRow && currentRow[amountUnitField];
                const amount = currentRow?.[amountField];
                const route = currentRow?.[routeField];
                return (
                  <TableRow key={adminId}>
                    <TableCell>{adminId}</TableCell>
                    <TableCell>
                      <Typography>{amount}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography>{route}</Typography>
                    </TableCell>
                    <TableCell>
                      <FormControl fullWidth>
                        <InputLabel size='small' id={`select-var-${adminId}-label`}>
                          Variable
                        </InputLabel>
                        <Select
                          labelId={`select-var-${adminId}-label`}
                          id={`select-var-${adminId}`}
                          label="Variable"
                          value={selectedVariable?.qname}
                          onChange={handleAmountMappingChange(adminId)}
                          size='small'
                          margin='dense'
                        >
                          {modelAmounts?.map((variable) => (
                            <MenuItem
                              key={variable.name}
                              value={variable.qname}
                            >
                              {variable.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <FormControl fullWidth>
                        <InputLabel size='small' id={`select-unit-${adminId}-label`}>
                          Units
                        </InputLabel>
                        <Select
                          labelId={`select-unit-${adminId}-label`}
                          id={`select-unit-${adminId}`}
                          label="Units"
                          value={adminUnit}
                          onChange={handleAmountUnitChange(adminId)}
                                                    size='small'
                          margin='dense'
                        >
                          {compatibleUnits?.map((unit) => (
                            <MenuItem key={unit.symbol} value={unit.symbol}>
                              {unit.symbol}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </>
  );
};

export default DosingProtocols;
