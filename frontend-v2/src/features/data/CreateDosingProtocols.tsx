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

const CreateDosingProtocols: FC<IDosingProtocols> = ({
  administrationIdField,
  amountUnit,
  state,
  units,
  variables,
  notificationsInfo,
}: IDosingProtocols) => {
  const amountField = state.fields.find(
    (field) =>
      field === "Amount" || state.normalisedFields.get(field) === "Amount",
  );
  // ignore rows with no amount and administration ID set to 0.
  const dosingRows: Row[] = state.data.filter((row) =>
    parseInt(row[administrationIdField]),
  );
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
      nextData
        .filter((row) =>
          administrationIdField ? row[administrationIdField] === id : true,
        )
        .forEach((row) => {
          row["Amount Variable"] = value;
          row["Amount Unit"] = amountUnit?.symbol === "pmol" ? "mg" : "mg/kg";
        });
      state.setData(nextData);
      state.setNormalisedFields(
        new Map([
          ...state.normalisedFields.entries(),
          ["Amount Variable", "Amount Variable"],
          ["Amount Unit", "Amount Unit"],
        ]),
      );
    };

  return (
    <>
      <Box component="div">
        <Typography variant="h5">Dosing</Typography>
        <Typography variant="body2" style={{ marginTop: ".5rem", marginBottom: '.5rem' }}>
          Map dosing compartments to your subject groups here. You can set dose
          amounts, units and intervals under Trial Design, once you have
          uploaded your data.
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
                  <Typography>Dosing Compartment</Typography>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {uniqueAdministrationIds.map((adminId) => {
                const currentRow = state.data.find((row) =>
                  administrationIdField
                    ? row[administrationIdField] === adminId
                    : true,
                );
                const selectedVariable = variables?.find(
                  (variable) =>
                    variable.qname === currentRow?.["Amount Variable"],
                );
                return (
                  <TableRow key={adminId}>
                    <TableCell sx={{ width: '10rem'}}>{adminId}</TableCell>
                    <TableCell>
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
