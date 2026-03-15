import { ChangeEvent, FC, useEffect, useMemo } from "react";
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
import { normaliseUnitSymbol } from "../unitUtils";
import { useUniqueDosingRows } from "./useUniqueDosingRows";

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
  console.log("DosingProtocols render", {
    administrationIdField,
    amountUnitField,
    amountUnit,
    state,
    units,
    variables,
    notificationsInfo,
    project,
  });
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
  const amountVariables = variables?.filter(isAmount) || [];

  const dosingRowKeyField = "__dosingRowKey";
  const doseGroupingFields = [
    administrationIdField,
    amountField,
    timeField,
    addlDosesField,
    interDoseField,
  ].filter((field): field is string => Boolean(field));
  const uniqueDosingRows = useUniqueDosingRows(
    dosingRows,
    doseGroupingFields,
    dosingRowKeyField,
  );

  const missingAdministrationIds = dosingRows.some(
    (row) =>
      !(administrationIdField in row) ||
      row[administrationIdField] === "" ||
      row[administrationIdField] === ".",
  );
  if (amountField && missingAdministrationIds) {
    generateAdministrationIds(dosingRows, "Administration ID", groupIdField);
    // Ensure Administration ID is added to normalisedFields
    state.normalisedFields = new Map([
      ...state.normalisedFields.entries(),
      ["Administration ID", "Administration ID"],
    ]);
  }
  const uniqueAdministrationIds = useMemo(() => {
    const administrationIds = administrationIdField
      ? dosingRows.map((row) => row[administrationIdField])
      : [];
    return [...new Set(administrationIds)];
  }, [administrationIdField, dosingRows]);

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

  // Validate that all administrations have a variable and unit selected
  // Only run validation when component is mounted or when selections change
  useEffect(() => {
    const errorMessage =
      "Please select a variable and unit for all dosing administrations.";

    // Check if all administrations have a variable and unit selected
    const allAdministrationsValid = uniqueAdministrationIds.every((id) => {
      const firstRow = dosingRows.find(
        (row) => row[administrationIdField] === id,
      );

      const hasVariable =
        firstRow?.[amountVariableField] && firstRow[amountVariableField] !== "";
      const hasUnit =
        firstRow?.[amountUnitField] && firstRow[amountUnitField] !== "";

      return hasVariable && hasUnit;
    });

    // Add or remove error based on validation
    if (!allAdministrationsValid && !state.errors.includes(errorMessage)) {
      state.errors = [...state.errors, errorMessage];
    }

    if (allAdministrationsValid && state.errors.includes(errorMessage)) {
      state.errors = state.errors.filter((error) => error !== errorMessage);
    }

    // Clean up error when component unmounts
    return () => {
      if (state.errors.includes(errorMessage)) {
        state.errors = state.errors.filter((error) => error !== errorMessage);
      }
    };
  }, [
    uniqueAdministrationIds,
    dosingRows,
    administrationIdField,
    amountVariableField,
    amountUnitField,
    state,
  ]);

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
          row[amountUnitField] = normaliseUnitSymbol(
            row[amountUnitField] || "",
          );
        });
      state.data = nextData;
      state.normalisedFields = new Map([
        ...state.normalisedFields.entries(),
        [amountVariableField, "Amount Variable"],
      ]);
    };
  const handleAmountChange =
    (rowKey: string) => (event: ChangeEvent<HTMLInputElement>) => {
      const nextData = [...state.data];
      const { value } = event.target;
      const uniqueDoseRow = uniqueDosingRows.find(
        (row) => row[dosingRowKeyField] === rowKey,
      );
      nextData
        .filter((row) => {
          return uniqueDoseRow
            ? doseGroupingFields.every(
                (field) => row[field] === uniqueDoseRow[field],
              )
            : row[dosingRowKeyField] === rowKey;
        })
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

  const handleFieldChange =
    (rowKey: string, field: string) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextData = [...state.data];
      const { value } = event.target;
      const uniqueDoseRow = uniqueDosingRows.find(
        (row) => row[dosingRowKeyField] === rowKey,
      );
      nextData
        .filter((row) => {
          return uniqueDoseRow
            ? doseGroupingFields.every(
                (field) => row[field] === uniqueDoseRow[field],
              )
            : row[dosingRowKeyField] === rowKey;
        })
        .forEach((row) => {
          row[field] = value;
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
              const uniqueDosedRows = uniqueDosingRows.filter((row) =>
                administrationIdField
                  ? row[administrationIdField] === adminId
                  : true,
              );
              return uniqueDosedRows.map((row) => {
                const rowKey = row[dosingRowKeyField];
                const selectedVariable = variables?.find(
                  (variable) =>
                    variable.qname ===
                    row?.[amountVariableField || "Amount Variable"],
                );
                const amountUnits = units?.find(
                  (unit) => unit.symbol === "mg",
                )?.compatible_units;
                const adminUnit = amountUnitField && row?.[amountUnitField];
                const normalisedAdminUnit = normaliseUnitSymbol(
                  adminUnit || "",
                );
                const groupId = row?.[groupIdField] || ".";
                const timeUnit = row?.[timeUnitField] || ".";
                const amount = row?.[amountField];
                const time = row?.[timeField];
                const isPerKg = row?.[perKgField] === "1";
                const additionalDoses = row?.[addlDosesField];
                const interDoseInterval = row?.[interDoseField];
                const displayedUnit = amountUnits?.find(
                  (unit) => unit.symbol === normalisedAdminUnit,
                )
                  ? normalisedAdminUnit
                  : "";
                return (
                  <DosingTableRow
                    key={rowKey}
                    rowKey={rowKey}
                    adminId={adminId}
                    groupId={groupId}
                    variable={selectedVariable}
                    amount={amount}
                    displayedUnit={displayedUnit}
                    time={time}
                    timeUnit={timeUnit}
                    isPerKg={isPerKg}
                    additionalDoses={additionalDoses}
                    interDoseInterval={interDoseInterval}
                    amountUnits={amountUnits}
                    amountVariables={amountVariables}
                    handleAmountMappingChange={handleAmountMappingChange}
                    handleAmountChange={handleAmountChange}
                    handleAmountUnitChange={handleAmountUnitChange}
                    handlePerBodyWeightChange={handlePerBodyWeightChange}
                    handleTimeChange={handleFieldChange(rowKey, timeField)}
                    handleAdditionalDosesChange={handleFieldChange(
                      rowKey,
                      addlDosesField,
                    )}
                    handleInterDoseIntervalChange={handleFieldChange(
                      rowKey,
                      interDoseField,
                    )}
                  />
                );
              });
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default DosingProtocols;

interface DosingTableRowProps {
  rowKey: string;
  adminId: string;
  groupId: string;
  variable?: VariableRead;
  amount?: string;
  displayedUnit?: string;
  time?: string;
  timeUnit?: string;
  isPerKg?: boolean;
  amountUnits?: { [key: string]: string }[];
  amountVariables?: VariableRead[];
  additionalDoses?: string;
  interDoseInterval?: string;
  handleAmountMappingChange: (id: string) => (event: SelectChangeEvent) => void;
  handleAmountChange: (
    rowKey: string,
  ) => (event: ChangeEvent<HTMLInputElement>) => void;
  handleAmountUnitChange: (id: string) => (event: SelectChangeEvent) => void;
  handlePerBodyWeightChange: (
    id: string,
  ) => (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleTimeChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleAdditionalDosesChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleInterDoseIntervalChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

function DosingTableRow({
  rowKey,
  adminId,
  groupId,
  variable,
  amountVariables,
  amount,
  displayedUnit,
  amountUnits,
  time,
  timeUnit,
  isPerKg,
  additionalDoses,
  interDoseInterval,
  handleAmountMappingChange,
  handleAmountChange,
  handleAmountUnitChange,
  handlePerBodyWeightChange,
  handleTimeChange,
  handleAdditionalDosesChange,
  handleInterDoseIntervalChange,
}: Readonly<DosingTableRowProps>) {
  return (
    <TableRow key={rowKey}>
      <TableCell sx={{ width: "5rem" }}>{adminId}</TableCell>
      <TableCell sx={{ width: "5rem" }}>
        <Typography>{groupId}</Typography>
      </TableCell>
      <TableCell sx={{ width: "10rem" }}>
        <FormControl fullWidth>
          <InputLabel size="small" id={`select-var-${rowKey}-label`}>
            Variable
          </InputLabel>
          <Select
            labelId={`select-var-${rowKey}-label`}
            id={`select-var-${rowKey}`}
            label="Variable"
            value={variable?.qname || ""}
            onChange={handleAmountMappingChange(adminId)}
            size="small"
            margin="dense"
          >
            <MenuItem value="">None</MenuItem>
            {amountVariables?.map((variable) => (
              <MenuItem key={variable.name} value={variable.qname}>
                {variable.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </TableCell>
      <NumericTableCell
        id={`input-amount-${rowKey}`}
        disabled={!variable}
        label="Amount"
        onChange={handleAmountChange(rowKey)}
        value={amount}
      />
      <TableCell>
        <FormControl fullWidth>
          <InputLabel size="small" id={`select-unit-${rowKey}-label`}>
            Units
          </InputLabel>
          <Select
            labelId={`select-unit-${rowKey}-label`}
            id={`select-unit-${rowKey}`}
            label="Units"
            value={displayedUnit}
            disabled={!amountUnits?.length}
            onChange={handleAmountUnitChange(adminId)}
            sx={{ maxWidth: "10rem" }}
            size="small"
            margin="dense"
          >
            <MenuItem value="">None</MenuItem>
            {amountUnits?.map((unit) => (
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
      <NumericTableCell
        id={`input-time-${rowKey}`}
        disabled={false}
        label="Time"
        onChange={handleTimeChange}
        value={time}
      />
      <TableCell>
        <Typography>{timeUnit}</Typography>
      </TableCell>
      <NumericTableCell
        id={`input-addDoses-${rowKey}`}
        disabled={false}
        label="Additional Doses"
        onChange={handleAdditionalDosesChange}
        value={additionalDoses}
      />
      <NumericTableCell
        id={`input-doseInterval-${rowKey}`}
        disabled={false}
        label="Interdose Interval"
        onChange={handleInterDoseIntervalChange}
        value={interDoseInterval}
      />
    </TableRow>
  );
}
