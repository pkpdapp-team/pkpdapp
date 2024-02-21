import { FC } from 'react';
import { Box, Select, FormControl, MenuItem, InputLabel, Stack, Table, TableHead, TableRow, TableCell, TableBody, Typography, SelectChangeEvent } from "@mui/material";
import { Field, Data } from "./LoadData";
import { StepperState } from "./LoadDataStepper";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import {
  VariableRead,
  useCombinedModelListQuery,
  useProjectRetrieveQuery,
  useUnitListQuery,
  useVariableListQuery
} from "../../app/backendApi";

interface IMapDosing {
  state: StepperState;
  firstTime: boolean;
}
    
const MapDosing: FC<IMapDosing> = ({state, firstTime}: IMapDosing) => {
  console.log({ state })
  const projectId = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const projectIdOrZero = projectId || 0;
  const { data: project, isLoading: isProjectLoading } =
    useProjectRetrieveQuery({ id: projectId || 0 }, { skip: !projectId });
  const { data: models = [], isLoading: isModelsLoading } =
    useCombinedModelListQuery(
      { projectId: projectIdOrZero },
      { skip: !projectId },
    );
  const { data: units, isLoading: isLoadingUnits } = useUnitListQuery(
    { compoundId: project?.compound },
    { skip: !project || !project.compound },
  );
  const [ model ] = models;
  const { data: variables } = useVariableListQuery(
    { dosedPkModelId: model?.id || 0 },
    { skip: !model?.id },
  );

  const amountField = state.fields.find(
    (field, i) => state.normalisedFields[i] === 'Amount'
  );
  const amountValues = amountField ?
    state.data.map(row => row[amountField]) :
    [];
  const amountUnitField = state.fields.find(
    (field, i) => state.normalisedFields[i] === 'Amount Unit'
  );
  const amountUnits = amountUnitField ?
    state.data.map(row => row[amountUnitField]) :
    [];
  const selectedVariable = variables?.find(variable => variable.qname === state.amountVariable);
  const variableUnits = units?.find(unit => unit.id === selectedVariable?.unit)?.compatible_units;
  const isAmount = (variable: VariableRead) => {
    const amountUnits = units?.find(
      (unit) => unit.symbol === "pmol/kg",
    )?.compatible_units;
    const variableUnit = units?.find((unit) => unit.id === variable.unit);
    return variableUnit?.symbol !== "" &&
      amountUnits?.find(
        (unit) => parseInt(unit.id) === variable.unit,
      ) !== undefined;
  }
  const modelAmounts = variables?.filter(isAmount) || [];

  const handleAmountMappingChange = (event: SelectChangeEvent) => {
    const { value } = event.target;
    state.setAmountVariable(value);
  }
  const handleAmountUnitChange = (event: SelectChangeEvent) => {
    const { value } = event.target;
    state.setAmountUnit(value);
  }
  console.log(units?.map(unit => unit.symbol))
  return (
    <>
      <p>Map dose amounts to dosing compartments in the model.</p>
      <Box component="div" sx={{ maxHeight: "40vh", overflow: 'auto', overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <Typography>
                  Amount
                </Typography>
              </TableCell>
              <TableCell>
                <Typography>
                  Unit
                </Typography>
              </TableCell>
              <TableCell>
                <Typography>
                  Mapping
                </Typography>
                <FormControl>
                  <InputLabel id={`select-var-label`}>Variable</InputLabel>
                  <Select
                    labelId={`select-var-label`}
                    id={`select-var`}
                    label='Variable'
                    value={state.amountVariable || modelAmounts?.[0]?.qname}
                    onChange={handleAmountMappingChange}
                  >
                    {modelAmounts?.map((variable) => (
                      <MenuItem key={variable.name} value={variable.qname}>{variable.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl>
                  <InputLabel id={`select-unit-label`}>Units</InputLabel>
                  <Select
                    labelId={`select-unit-label`}
                    id={`select-unit`}
                    label='Units'
                    value={state.amountUnit}
                    onChange={handleAmountUnitChange}
                  >
                    {variableUnits?.map((unit) => (
                      <MenuItem key={unit.symbol} value={unit.symbol}>{unit.symbol}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {amountValues.map((amount, index) => (
              <TableRow key={index}>
                <TableCell>{amount}</TableCell>
                <TableCell>{amountUnits[index]}</TableCell>
                <TableCell>
                  {state.amountVariable}
                  [{state.amountUnit}]
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </>
  )
}

export default MapDosing;

 