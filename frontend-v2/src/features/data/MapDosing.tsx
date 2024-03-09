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

const MapDosing: FC<IMapDosing> = ({ state, firstTime }: IMapDosing) => {
  const projectId = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const projectIdOrZero = projectId || 0;
  const { data: project } =
    useProjectRetrieveQuery({ id: projectId || 0 }, { skip: !projectId });
  const { data: models = [] } =
    useCombinedModelListQuery(
      { projectId: projectIdOrZero },
      { skip: !projectId },
    );
  const { data: units } = useUnitListQuery(
    { compoundId: project?.compound },
    { skip: !project || !project.compound },
  );
  const [model] = models;
  const { data: variables } = useVariableListQuery(
    { dosedPkModelId: model?.id || 0 },
    { skip: !model?.id },
  );

  const amountField = state.fields.find(
    (field, i) => state.normalisedFields[i] === 'Amount'
  );
  const dosingRows = amountField ? state.data.filter(row => row[amountField] && row[amountField] !== '.') : [];
  const amountUnitField = state.fields.find(
    (field, i) => ['Amount Unit', 'Unit'].includes(state.normalisedFields[i])
  );
  const administrationIdField = state.fields.find(
    (field, i) => state.normalisedFields[i] === 'Administration ID'
  );
  const administrationIds = administrationIdField ?
    dosingRows.map(row => row[administrationIdField]) :
    [];
  const uniqueAdministrationIds = [...new Set(administrationIds)];
  const routeField = state.fields.find(field => field.toLowerCase() === 'route');
  
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
        row['Amount Unit'] = value;
      })
    state.setData(nextData);
  }
  return (
    <>
      <p>Map dose amounts to dosing compartments in the model.</p>
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
                  Amount
                </Typography>
              </TableCell>
              <TableCell>
                <Typography>
                  Route
                </Typography>
              </TableCell>
              <TableCell>
                <Typography>
                  Unit
                </Typography>
              </TableCell>
              <TableCell>
                <Typography>
                  Dosing Compartment
                </Typography>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {uniqueAdministrationIds.map((adminId, index) => {
              const currentRow = dosingRows.find(row => administrationIdField ? row[administrationIdField] === adminId : true);
              const selectedVariable = variables?.find(variable => variable.qname === currentRow?.['Amount Variable']);
              const compatibleUnits = units?.find(unit => unit.id === selectedVariable?.unit)?.compatible_units;
              const adminUnit = amountUnitField && currentRow && currentRow[amountUnitField];
              const amount = amountField && currentRow?.[amountField];
              const route = routeField && currentRow?.[routeField];
              return (
                <TableRow>
                  <TableCell>
                    {adminId}
                  </TableCell>
                  <TableCell>
                    <Typography>
                      {amount}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography>
                      {route}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {adminUnit ?
                      adminUnit :
                      <FormControl>
                        <InputLabel id={`select-unit-${adminId}-label`}>Units</InputLabel>
                        <Select
                          labelId={`select-unit-${adminId}-label`}
                          id={`select-unit-${adminId}`}
                          label='Units'
                          value={currentRow?.['Amount Unit']}
                          onChange={handleAmountUnitChange(adminId)}
                        >
                          {compatibleUnits?.map((unit) => (
                            <MenuItem key={unit.symbol} value={unit.symbol}>{unit.symbol}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    }
                  </TableCell>
                  <TableCell>
                    <FormControl>
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
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Box>
    </>
  )
}

export default MapDosing;

