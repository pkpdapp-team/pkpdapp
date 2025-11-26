import { ChangeEvent, FC } from "react";
import {
  Box,
  Checkbox,
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

function findFieldByType(type: string, state: StepperState) {
  return (
    state.fields.find((field) => state.normalisedFields.get(field) === type) ||
    type
  );
}

/**
 * Assign an administration ID to each dosing row based on the dosing compartment and group ID.
 * @param dosingRows
 * @param administrationIdField
 * @param groupIdField
 * @returns an array of modified dosing rows.
 */
export function generateAdministrationIds(
  dosingRows: Row[],
  administrationIdField: string,
  groupIdField: string,
) {
  const dosingCompartments = [
    ...new Set(dosingRows.map((row) => row["Amount Variable"])),
  ];
  const uniqueGroupIds = [
    ...new Set(dosingRows.map((row) => row[groupIdField])),
  ];
  const administrationIds: string[] = [];
  dosingRows.forEach((row) => {
    const groupIndex = uniqueGroupIds.indexOf(row[groupIdField]) + 1;
    const compartmentIndex = dosingCompartments.indexOf(row["Amount Variable"]);
    const adminId = `${compartmentIndex * 10 + groupIndex}`;
    if (row[administrationIdField] !== adminId) {
      row[administrationIdField] = adminId;
    }
    administrationIds.push(adminId);
  });
  return dosingRows;
}

/**
 * Create dosing rows for each subject and dosing compartment.
 * Each row has an administration ID based on the dosing compartment and group ID.
 * @param state stepper state
 * @param administrationIdField column name for administration ID
 * @param dosingCompartments dosing compartments for the model
 * @param amountUnit amount unit for the model (either pmol or pmol/kg.)
 */
function createDosingRows(
  state: StepperState,
  administrationIdField: string,
  dosingCompartments: string[],
) {
  const idField = findFieldByType("ID", state);
  const timeField = findFieldByType("Time", state);
  const timeUnitField = findFieldByType("Time Unit", state);
  const amountField = findFieldByType("Amount", state);
  const amountUnitField = findFieldByType("Amount Unit", state);
  const perKgField = findFieldByType("Per Body Weight(kg)", state);
  const covariateFields = state.fields.filter(
    (field) => state.normalisedFields.get(field) === "Cat Covariate",
  );
  const nextData = [...state.data];
  const uniqueIds = new Set(nextData.map((row) => row[idField]));
  const uniqueGroupIds = [...new Set(nextData.map((row) => row["Group ID"]))];
  const newRows: Row[] = [];
  dosingCompartments.forEach((compartment, index) => {
    uniqueIds.forEach((id) => {
      const subjectRow = state.data.find((row) => row[idField] === id);
      const groupId = subjectRow?.["Group ID"];
      const groupIndex = groupId ? uniqueGroupIds.indexOf(groupId) + 1 : 0;
      const adminId = index * 10 + groupIndex;
      const timeUnit = subjectRow?.[timeUnitField] || "h";
      const newRow: Row = {
        [idField]: id,
        [administrationIdField]: adminId.toString(),
        "Amount Variable": compartment,
        [amountUnitField]: "mg",
        [perKgField]: "0",
        [amountField]: "0",
        [timeField]: "0",
        [timeUnitField]: timeUnit,
        "Infusion Duration": "0.0833",
        "Additional Doses": ".",
        "Interdose Interval": ".",
      };
      if (groupId) {
        newRow["Group ID"] = groupId;
        newRow[state.groupColumn] = groupId;
      }
      covariateFields.forEach((field) => {
        newRow[field] = subjectRow?.[field] || "";
      });
      newRows.push(newRow);
    });
  });
  newRows.sort((a, b) => parseInt(a[idField]) - parseInt(b[idField]));
  state.data = [...nextData, ...newRows];
  state.normalisedFields = new Map([
    ...state.normalisedFields.entries(),
    ["Amount Variable", "Amount Variable"],
    ["Amount Unit", "Amount Unit"],
    ["Per Body Weight(kg)", "Per Body Weight(kg)"],
    ["Infusion Duration", "Infusion Duration"],
    ["Additional Doses", "Additional Doses"],
    ["Interdose Interval", "Interdose Interval"],
  ]);
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
  dosingCompartments?: string[];
  state: StepperState;
  units: UnitRead[];
  variables: VariableRead[];
  notificationsInfo: {
    isOpen: boolean;
    count: number;
  };
}

const CreateDosingProtocols: FC<IDosingProtocols> = ({
  administrationIdField,
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
  const amountUnitField = findFieldByType("Amount Unit", state);
  const timeField = findFieldByType("Time", state);
  const groupIdField = findFieldByType("Group ID", state);
  const perKgField = findFieldByType("Per Body Weight(kg)", state);
  // ignore rows with no amount and administration ID set to 0.
  let dosingRows: Row[] = state.data.filter((row) =>
    parseInt(row[administrationIdField]),
  );
  if (!dosingRows.length) {
    createDosingRows(state, administrationIdField, dosingCompartments);
  }
  if (!amountField) {
    const newNormalisedFields = new Map([
      ...state.normalisedFields.entries(),
      ["Amount", "Amount"],
    ]);
    const newData = state.data.map((row) => ({ ...row, Amount: "." }));
    state.normalisedFields = newNormalisedFields;
    state.data = newData;
  }
  const missingAdministrationIds = dosingRows.some(
    (row) => !(administrationIdField in row),
  );
  if (missingAdministrationIds) {
    dosingRows = generateAdministrationIds(
      dosingRows,
      administrationIdField,
      groupIdField,
    );
  }

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
      state.data = nextData;
    };

  const handlePerBodyWeightChange =
    (id: string) => (event: ChangeEvent<HTMLInputElement>) => {
      const nextData = [...state.data];
      const { checked } = event.target;
      nextData
        .filter(
          (row) => row[administrationIdField] === id && row["Amount"] !== ".",
        )
        .forEach((row) => {
          row[perKgField] = checked ? "1" : "0";
        });
      state.data = nextData;
    };

  return (
    <Box component="div">
      <TableHeader
        id="create-dosing-protocols-header"
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
        <Table
          stickyHeader
          size="small"
          aria-labelledby="create-dosing-protocols-header"
        >
          <TableHead>
            <TableRow>
              <TableCell>
                <Typography>Administration ID</Typography>
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
            {dosingCompartments.map((compartment) => {
              const dosingRows = state.data.filter(
                (row) =>
                  row["Amount Variable"] === compartment &&
                  row["Amount"] !== ".",
              );
              const administrationIds = dosingRows.map(
                (row) => row[administrationIdField],
              );
              const uniqueAdministrationIds = [...new Set(administrationIds)];
              return uniqueAdministrationIds.map((adminId) => {
                const [currentRow] = dosingRows.filter((row) =>
                  administrationIdField
                    ? row[administrationIdField] === adminId
                    : true,
                );
                const selectedVariable = variables?.find(
                  (variable) =>
                    variable.qname === currentRow?.["Amount Variable"],
                );
                const compatibleUnits = units?.find(
                  (unit) => unit.id === selectedVariable?.unit,
                )?.compatible_units;
                const defaultAmountUnit = "mg";
                const selectedAmountUnit =
                  currentRow?.[amountUnitField] || defaultAmountUnit;
                const isPerKg = currentRow?.[perKgField] === "1";
                return (
                  <TableRow key={adminId}>
                    <TableCell sx={{ width: "5rem" }}>
                      {currentRow?.[administrationIdField]}
                    </TableCell>
                    <TableCell sx={{ width: "5rem" }}>
                      {currentRow?.[groupIdField]}
                    </TableCell>
                    <TableCell sx={{ width: "10rem" }}>
                      {selectedVariable?.name}
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
                    <TableCell>
                      <Checkbox
                        name={"amount_per_body_weight"}
                        checked={isPerKg}
                        onChange={handlePerBodyWeightChange(adminId)}
                        slotProps={{
                          input: { "aria-label": "Per Body Weight(kg)" },
                        }}
                      />
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
              });
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default CreateDosingProtocols;
