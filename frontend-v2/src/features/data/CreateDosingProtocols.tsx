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
  TextField,
} from "@mui/material";
import { StepperState } from "./LoadDataStepper";
import { UnitRead, VariableRead } from "../../app/backendApi";
import { Row } from "./LoadData";
import { TableHeader } from "../../components/TableHeader";
import {
  calculateTableHeights,
  getTableHeight,
  SINGLE_TABLE_BREAKPOINTS,
} from "../../shared/calculateTableHeights";

function createDosingRows(
  state: StepperState,
  administrationIdField: string,
  dosingCompartments: string[],
  amountUnit?: UnitRead,
) {
  const nextData = [...state.data];
  const uniqueIds = new Set(nextData.map((row) => row["ID"]));
  const uniqueGroupIds = [...new Set(nextData.map((row) => row["Group ID"]))];
  dosingCompartments.forEach((compartment, index) => {
    uniqueIds.forEach((id) => {
      const groupId = state.data.find((row) => row["ID"] === id)?.["Group ID"];
      const groupIndex = groupId ? uniqueGroupIds.indexOf(groupId) + 1 : 0;
      const adminId = index * 10 + groupIndex;
      const newRow: Row = {
        ID: id,
        [administrationIdField]: adminId.toString(),
        "Amount Variable": compartment,
        "Amount Unit": amountUnit?.symbol === "pmol" ? "mg" : "mg/kg",
        Amount: "0",
        Time: "0",
        "Time Unit": "h",
        "Infusion Duration": "0.0833",
        "Additional Doses": ".",
        "Interdose Interval": ".",
        Observation: ".",
      };
      if (groupId) {
        newRow["Group ID"] = groupId;
        newRow[state.groupColumn] = groupId;
      }
      nextData.push(newRow);
    });
  });
  state.setData(nextData);
  state.setNormalisedFields(
    new Map([
      ...state.normalisedFields.entries(),
      ["Amount Variable", "Amount Variable"],
      ["Amount Unit", "Amount Unit"],
      ["Infusion Duration", "Infusion Duration"],
      ["Additional Doses", "Additional Doses"],
      ["Interdose Interval", "Interdose Interval"],
    ]),
  );
}

type NumericTableCellProps = {
  id: string;
  disabled: boolean;
  label: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  value: string | number | null | undefined;
};
const NumericTableCell: FC<NumericTableCellProps> = ({
  id,
  disabled,
  label,
  onChange,
  value,
}) => {
  return (
    <TableCell sx={{ width: "10rem" }}>
      <TextField
        id={id}
        disabled={disabled}
        label={label}
        value={value}
        onChange={onChange}
        type="number"
        size="small"
        margin="dense"
        slotProps={{
          inputLabel: {
            shrink: true,
          },
        }}
      />
    </TableCell>
  );
};

interface IDosingProtocols {
  administrationIdField: string;
  amountUnitField?: string;
  amountUnit?: UnitRead;
  dosingCompartments?: string[];
  state: StepperState;
  units: UnitRead[];
  variables: VariableRead[];
  notificationsInfo: {
    isOpen: boolean;
    count: number;
  };
}

function findFieldByName(name: string, state: StepperState) {
  return (
    state.fields.find((field) => state.normalisedFields.get(field) === name) ||
    name
  );
}

const CreateDosingProtocols: FC<IDosingProtocols> = ({
  administrationIdField,
  amountUnit,
  dosingCompartments = [],
  state,
  units,
  variables,
  notificationsInfo,
}: IDosingProtocols) => {
  const amountField = state.fields.find(
    (field) =>
      field === "Amount" || state.normalisedFields.get(field) === "Amount",
  );
  const amountUnitField = findFieldByName("Amount Unit", state);
  const timeField = findFieldByName("Time", state);
  // ignore rows with no amount and administration ID set to 0.
  const dosingRows: Row[] = state.data.filter((row) =>
    parseInt(row[administrationIdField]),
  );
  if (!dosingRows.length) {
    createDosingRows(
      state,
      administrationIdField,
      dosingCompartments,
      amountUnit,
    );
  }
  if (!amountField) {
    const newNormalisedFields = new Map([
      ...state.normalisedFields.entries(),
      ["Amount", "Amount"],
    ]);
    const newData = state.data.map((row) => ({ ...row, Amount: "." }));
    state.setNormalisedFields(newNormalisedFields);
    state.setData(newData);
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
      const dosingRows = nextData.filter(
        (row) => row[administrationIdField] === id && row["Amount"] !== ".",
      );
      dosingRows.forEach((row) => {
        row["Amount Variable"] = value;
      });
      state.setData(nextData);
    };
  type InputChangeEvent =
    | ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    | SelectChangeEvent;
  const handleInputChange =
    (id: string, field: string) => (event: InputChangeEvent) => {
      const nextData = [...state.data];
      const { value } = event.target;
      nextData
        .filter(
          (row) => row[administrationIdField] === id && row["Amount"] !== ".",
        )
        .forEach((row) => {
          row[field] = value;
        });
      state.setData(nextData);
    };

  return (
    <>
      <Box component="div">
        <TableHeader
          label="Dosing"
          tooltip="Map dosing compartments to your subject groups here. You can set dose
          amounts, units and intervals under Trial Design, once you have
          uploaded your data."
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
                  <Typography>Group</Typography>
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
                const currentRow = state.data.find((row) =>
                  administrationIdField
                    ? row[administrationIdField] === adminId &&
                      row["Amount"] !== "."
                    : true,
                );
                const selectedVariable = variables?.find(
                  (variable) =>
                    variable.qname === currentRow?.["Amount Variable"],
                );
                const compatibleUnits = units?.find(
                  (unit) => unit.id === selectedVariable?.unit,
                )?.compatible_units;
                const defaultAmountUnit =
                  amountUnit?.symbol === "pmol" ? "mg" : "mg/kg";
                const selectedAmountUnit =
                  currentRow?.[amountUnitField] || defaultAmountUnit;
                return (
                  <TableRow key={adminId}>
                    <TableCell sx={{ width: "5rem" }}>{adminId}</TableCell>
                    <TableCell sx={{ width: "5rem" }}>
                      {currentRow?.["Group ID"]}
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
                          value={selectedVariable?.qname}
                          onChange={handleAmountMappingChange(adminId)}
                          size="small"
                          margin="dense"
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
                    <NumericTableCell
                      id={`input-amount-${adminId}`}
                      disabled={!selectedVariable}
                      label="Amount"
                      onChange={handleInputChange(adminId, "Amount")}
                      value={currentRow?.["Amount"]}
                    />
                    <TableCell sx={{ width: "10rem" }}>
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
                          disabled={!selectedVariable}
                          value={selectedAmountUnit}
                          onChange={handleInputChange(adminId, amountUnitField)}
                          sx={{ maxWidth: "10rem" }}
                          size="small"
                          margin="dense"
                        >
                          {compatibleUnits?.map((unit) => (
                            <MenuItem key={unit.symbol} value={unit.symbol}>
                              {unit.symbol}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <NumericTableCell
                      id={`input-time-${adminId}`}
                      disabled={!selectedVariable}
                      label="Time"
                      onChange={handleInputChange(adminId, timeField)}
                      value={currentRow?.[timeField]}
                    />
                    <TableCell sx={{ width: "10rem" }}>
                      <Typography>{currentRow?.["Time Unit"]}</Typography>
                    </TableCell>
                    <NumericTableCell
                      id={`input-addDoses-${adminId}`}
                      disabled={!selectedVariable}
                      label="Additional Doses"
                      onChange={handleInputChange(adminId, "Additional Doses")}
                      value={currentRow?.["Additional Doses"]}
                    />
                    <NumericTableCell
                      id={`input-doseInterval-${adminId}`}
                      disabled={!selectedVariable}
                      label="Interdose Interval"
                      onChange={handleInputChange(
                        adminId,
                        "Interdose Interval",
                      )}
                      value={currentRow?.["Interdose Interval"]}
                    />
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

export default CreateDosingProtocols;
