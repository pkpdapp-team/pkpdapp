import { ChangeEvent, FC } from "react";
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
  SelectChangeEvent,
  TableContainer,
  Checkbox,
} from "@mui/material";
import { StepperState } from "../LoadDataStepper";
import { ProjectRead, UnitRead, VariableRead } from "../../../app/backendApi";
import { validateState } from "../dataValidation";
import { Row } from "../LoadData";
import { TableHeader } from "../../../components/TableHeader";
import { generateAdministrationIds } from "./generateAdministrationIds";
import {
  calculateTableHeights,
  getTableHeight,
  SINGLE_TABLE_BREAKPOINTS,
} from "../../../shared/calculateTableHeights";
import { NumericTableCell } from "./NumericTableCell";
import { findFieldByType } from "../findFieldByType";

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
  project: ProjectRead;
}

const DosingProtocols: FC<IDosingProtocols> = ({
  administrationIdField,
  amountUnitField = "Amount Unit",
  amountUnit,
  state,
  units,
  variables,
  notificationsInfo,
  project,
}: IDosingProtocols) => {
  const amountField = findFieldByType("Amount", state);
  const amountVariableField = findFieldByType("Amount Variable", state);
  const timeField = findFieldByType("Time", state);
  const timeUnitField = findFieldByType("Time Unit", state);
  const groupIdField = state.groupColumn;
  const addlDosesField = findFieldByType("Additional Doses", state);
  const interDoseField = findFieldByType("Interdose Interval", state);
  const perKgField = findFieldByType("Per Body Weight(kg)", state);
  const dosingRows: Row[] = amountField
    ? state.data.filter(
        (row) =>
          (row[amountField] && row[amountField] !== ".") ||
          parseInt(row[administrationIdField]),
      )
    : state.data.filter((row) => parseInt(row[administrationIdField]));
  const missingAdministrationIds = dosingRows.some(
    (row) => !(administrationIdField in row),
  );
  if (amountField && missingAdministrationIds) {
    generateAdministrationIds(dosingRows, "Administration ID", groupIdField);
  }
  const administrationIds = administrationIdField
    ? dosingRows.map((row) => row[administrationIdField])
    : [];
  const uniqueAdministrationIds = [...new Set(administrationIds)];

  if (!perKgField) {
    dosingRows.forEach((row) => {
      const selectedVariable = variables.find(
        (variable) =>
          variable.qname === row[amountVariableField || "Amount Variable"],
      );
      const isHuman = project.species === "H";
      const isAvhOrAah =
        selectedVariable?.name == "Avh" || selectedVariable?.name == "Aah";
      if (!isHuman && !isAvhOrAah) {
        row["Per Body Weight(kg)"] = "1";
      } else {
        row["Per Body Weight(kg)"] = "0";
      }
    });
    state.normalisedFields = new Map([
      ...state.normalisedFields.entries(),
      ["Per Body Weight(kg)", "Per Body Weight(kg)"],
    ]);
  }

  const isAmount = (variable: VariableRead) => {
    const amountUnits = units?.find(
      (unit) => unit.symbol === amountUnit?.symbol,
    )?.compatible_units;
    const variableUnit = units?.find((unit) => unit.id === variable.unit);
    return (
      variable.constant === false &&
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
      state.data = nextData;
      state.normalisedFields = new Map([
        ...state.normalisedFields.entries(),
        [amountVariableField, "Amount Variable"],
      ]);
    };
  const handleAmountChange =
    (id: string) => (event: ChangeEvent<HTMLInputElement>) => {
      const nextData = [...state.data];
      const { value } = event.target;
      nextData
        .filter((row) =>
          administrationIdField ? row[administrationIdField] === id : true,
        )
        .forEach((row) => {
          row[amountField] = value;
        });
      const newNormalisedFields = new Map([
        ...state.normalisedFields.entries(),
        [amountField, "Amount"],
      ]);
      state.data = nextData;
      state.normalisedFields = newNormalisedFields;
      const { errors, warnings } = validateState({
        ...state,
        data: nextData,
        normalisedFields: newNormalisedFields,
      });
      state.errors = errors;
      state.warnings = warnings;
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
    state.data = nextData;
    state.normalisedFields = newNormalisedFields;
    const { errors, warnings } = validateState({
      ...state,
      data: nextData,
      normalisedFields: newNormalisedFields,
    });
    state.errors = errors;
    state.warnings = warnings;
  };

  const handlePerBodyWeightChange =
    (id: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextData = [...state.data];
      const { checked } = event.target;
      nextData
        .filter((row) =>
          administrationIdField ? row[administrationIdField] === id : true,
        )
        .forEach((row) => {
          row[perKgField] = checked ? "1" : "0";
        });
      state.data = nextData;
    };

  return (
    <Box component="div">
      <TableHeader
        id="dosing-protocols-header"
        label="Dosing"
        tooltip="Set a dosing compartment and unit for each of your subject groups
          here."
      />
      <TableContainer
        sx={{
          maxHeight: calculateTableHeights({
            baseHeight: getTableHeight({ steps: SINGLE_TABLE_BREAKPOINTS }),
            isOpen: notificationsInfo.isOpen,
            count: notificationsInfo.count,
          }),
          transition: "all .35s ease-in",
        }}
      >
        <Table
          stickyHeader
          size="small"
          aria-labelledby="dosing-protocols-header"
        >
          <TableHead>
            <TableRow>
              <TableCell>
                <Typography>{administrationIdField}</Typography>
              </TableCell>
              <TableCell>
                <Typography>Group ID</Typography>
              </TableCell>
              <TableCell>
                <Typography>Dosing Compartment</Typography>
              </TableCell>
              <TableCell>
                <Typography>Amount</Typography>
              </TableCell>
              <TableCell>
                <Typography>Amount Unit</Typography>
              </TableCell>
              <TableCell>
                <Typography>Per Body Weight(kg)</Typography>
              </TableCell>
              <TableCell>
                <Typography>Time</Typography>
              </TableCell>
              <TableCell>
                <Typography>Time Unit</Typography>
              </TableCell>
              <TableCell>
                <Typography>Additional Doses</Typography>
              </TableCell>
              <TableCell>
                <Typography>Interdose Interval</Typography>
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
              const time = currentRow?.[timeField];
              const isPerKg = currentRow?.[perKgField] === "1";
              const displayedUnit = compatibleUnits?.find(
                (unit) => unit.symbol === adminUnit,
              )
                ? adminUnit
                : "";
              return (
                <TableRow key={adminId}>
                  <TableCell sx={{ width: "5rem" }}>{adminId}</TableCell>
                  <TableCell sx={{ width: "5rem" }}>
                    <Typography>
                      {currentRow?.[state.groupColumn] || "."}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ width: "10rem" }}>
                    <FormControl fullWidth>
                      <InputLabel
                        size="small"
                        id={`select-var-${adminId}-label`}
                      >
                        Variable
                      </InputLabel>
                      <Select
                        labelId={`select-var-${adminId}-label`}
                        id={`select-var-${adminId}`}
                        label="Variable"
                        value={selectedVariable?.qname || ""}
                        onChange={handleAmountMappingChange(adminId)}
                        size="small"
                        margin="dense"
                      >
                        <MenuItem value="">None</MenuItem>
                        {modelAmounts?.map((variable) => (
                          <MenuItem key={variable.name} value={variable.qname}>
                            {variable.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <NumericTableCell
                    id={`input-amount-${adminId}`}
                    disabled={!selectedVariable}
                    label="Amount"
                    onChange={handleAmountChange(adminId)}
                    value={amount}
                  />{" "}
                  <TableCell>
                    {" "}
                    <FormControl fullWidth>
                      {" "}
                      <InputLabel
                        size="small"
                        id={`select-unit-${adminId}-label`}
                      >
                        Units
                      </InputLabel>
                      <Select
                        labelId={`select-unit-${adminId}-label`}
                        id={`select-unit-${adminId}`}
                        label="Units"
                        value={displayedUnit}
                        disabled={!compatibleUnits?.length}
                        onChange={handleAmountUnitChange(adminId)}
                        sx={{ maxWidth: "10rem" }}
                        size="small"
                        margin="dense"
                      >
                        <MenuItem value="">None</MenuItem>
                        {compatibleUnits?.map((unit) => (
                          <MenuItem key={unit.symbol} value={unit.symbol}>
                            {unit.symbol}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>
                    <Checkbox
                      name={"amount_per_body_weight"}
                      onChange={handlePerBodyWeightChange(adminId)}
                      checked={isPerKg}
                      slotProps={{
                        input: { "aria-label": "Per Body Weight(kg)" },
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ width: "5rem" }}>
                    <Typography>{time}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography>
                      {currentRow?.[timeUnitField] || "."}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography>
                      {currentRow?.[addlDosesField] || "."}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography>
                      {currentRow?.[interDoseField] || "."}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default DosingProtocols;
