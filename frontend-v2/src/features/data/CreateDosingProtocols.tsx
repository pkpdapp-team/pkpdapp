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
} from "@mui/material";
import { StepperState } from "./LoadDataStepper";
import { UnitRead, VariableRead } from "../../app/backendApi";

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
  amountUnit,
  state,
  units,
  variables,
}: IDosingProtocols) => {
  const amountField = state.fields.find(
    (field) =>
      field === "Amount" || state.normalisedFields.get(field) === "Amount",
  );
  if (!amountField) {
    const newFields = [...state.fields, "Amount"];
    const newNormalisedFields = new Map([
      ...state.normalisedFields.entries(),
      ["Amount", "Amount"],
    ]);
    const newData = state.data.map((row) => ({ ...row, Amount: "." }));
    state.setFields(newFields);
    state.setNormalisedFields(newNormalisedFields);
    state.setData(newData);
  }
  const administrationIds = administrationIdField
    ? state.data.map((row) => row[administrationIdField])
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
        });
      state.setData(nextData);
    };
  return (
    <>
      <Alert severity="info">
        Map dosing compartments to your subject groups here. You can set dose
        amounts, units and intervals under Trial Design, once you have uploaded
        your data.
      </Alert>
      <Box
        component="div"
        marginTop={2}
        sx={{ maxHeight: "40vh", overflow: "auto", overflowX: "auto" }}
      >
        <Table>
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
                  <TableCell>{adminId}</TableCell>
                  <TableCell>
                    <FormControl fullWidth>
                      <InputLabel id={`select-var-${adminId}-label`}>
                        Variable
                      </InputLabel>
                      <Select
                        labelId={`select-var-${adminId}-label`}
                        id={`select-var-${adminId}`}
                        label="Variable"
                        value={selectedVariable?.qname}
                        onChange={handleAmountMappingChange(adminId)}
                      >
                        {modelAmounts?.map((variable) => (
                          <MenuItem key={variable.name} value={variable.qname}>
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
      </Box>
    </>
  );
};

export default CreateDosingProtocols;
