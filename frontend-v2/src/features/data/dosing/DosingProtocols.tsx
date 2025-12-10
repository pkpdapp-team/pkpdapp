import { FC } from "react";
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
import { UnitRead, VariableRead } from "../../../app/backendApi";
import { validateState } from "../dataValidation";
import { Row } from "../LoadData";
import { TableHeader } from "../../../components/TableHeader";
import { generateAdministrationIds } from "./CreateDosingProtocols";
import {
  calculateTableHeights,
  getTableHeight,
  SINGLE_TABLE_BREAKPOINTS,
} from "../../../shared/calculateTableHeights";

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

function findFieldByType(name: string, state: StepperState) {
  return (
    state.fields.find((field) => state.normalisedFields.get(field) === name) ||
    name
  );
}

const DosingProtocols: FC<IDosingProtocols> = ({
  administrationIdField,
  amountUnitField = "Amount Unit",
  amountUnit,
  state,
  units,
  variables,
  notificationsInfo,
}: IDosingProtocols) => {
  const amountField = findFieldByType("Amount", state);
  const amountVariableField = findFieldByType("Amount Variable", state);
  const timeField = findFieldByType("Time", state);
  const timeUnitField = findFieldByType("Time Unit", state);
  const groupIdField = findFieldByType("Group ID", state);
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
        <Table stickyHeader size="small">
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
                    <Typography>{currentRow?.["Group ID"] || "."}</Typography>
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
                  <TableCell sx={{ width: "10rem" }}>
                    <Typography>{amount}</Typography>
                  </TableCell>
                  <TableCell>
                    <FormControl fullWidth>
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
