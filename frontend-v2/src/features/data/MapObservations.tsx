import { FC } from 'react';
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
  SelectChangeEvent
} from "@mui/material";
import { StepperState } from "./LoadDataStepper";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import {
  useCombinedModelListQuery,
  useProjectRetrieveQuery,
  useUnitListQuery,
  useVariableListQuery
} from "../../app/backendApi";
import useObservationRows from './useObservationRows';

interface IMapObservations {
  state: StepperState;
  firstTime: boolean;
}

function displayUnitSymbol(symbol: string | undefined) {
  return symbol === '' ? 'dimensionless' : symbol;
}

const MapObservations: FC<IMapObservations> = ({state}: IMapObservations) => {
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
  const [ model ] = models;
  const { data: variables } = useVariableListQuery(
    { dosedPkModelId: model?.id || 0 },
    { skip: !model?.id },
  );
  const { data: units } = useUnitListQuery(
    { compoundId: project?.compound },
    { skip: !project || !project.compound },
  );

  const {
    observationRows,
    observationIdField,
    observationUnitField,
    observationVariableField,
    observationIds,
    uniqueObservationIds,
    observationUnits,
    observationValues,
    observationVariables
  } = useObservationRows(state);
  
  const filterOutputs = model?.is_library_model
    ? ["environment.t", "PDCompartment.C_Drug"]
    : [];
  const modelOutputs =
    variables?.filter(
      (variable) =>
        !variable.constant && !filterOutputs.includes(variable.qname),
    ) || [];

  const handleObservationChange = (id: string) => (event: SelectChangeEvent) => {
    const nextData = [...state.data];
    const { value } = event.target;
    const selectedVariable = variables?.find(variable => variable.qname === value);
    const defaultUnit = units?.find(unit => unit.id === selectedVariable?.unit);
    nextData.filter(row => observationIdField ? row[observationIdField] === id : true)
      .forEach(row => {
        row[observationVariableField || 'Observation Variable'] = value;
        const selectedUnitSymbol = row[observationUnitField || 'Observation_unit'];
        if (!selectedUnitSymbol && defaultUnit) {
          row['Observation_unit'] = defaultUnit?.symbol
        }
      });
    state.setData(nextData);
  }
  const handleUnitChange = (id: string) => (event: SelectChangeEvent) => {
    const nextData = [...state.data];
    const { value } = event.target;
    nextData.filter(row => observationIdField ? row[observationIdField] === id : true)
      .forEach(row => {
        row[observationUnitField || 'Observation_unit'] = value;
      });
    state.setData(nextData);
  }
  return (
    <>
      <Alert severity='info'>
        Map observations to variables in the model.
      </Alert>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>
              <Typography>
                {observationIdField}
              </Typography>
            </TableCell>
            <TableCell>
              <Typography>
                Observation
              </Typography>
            </TableCell>
            <TableCell>
              <Typography>
                Unit
              </Typography>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {uniqueObservationIds
            .sort((a, b) => a > b ? 1 : -1)
            .map((obsId) => {
              const currentRow = observationRows.find(row => observationIdField ? row[observationIdField] === obsId : true);
              const selectedVariable = variables?.find(
                variable => variable.qname === currentRow?.[observationVariableField || 'Observation Variable']
              );
              let selectedUnitSymbol = currentRow?.[observationUnitField || 'Observation_unit'];
              selectedUnitSymbol = units?.find(unit => unit.symbol === selectedUnitSymbol)?.symbol;
              const compatibleUnits = selectedVariable
                ? units?.find(unit => unit.id === selectedVariable?.unit)?.compatible_units
                : units;
              ['%', 'fraction', 'ratio'].forEach(token => {
                if (selectedUnitSymbol?.toLowerCase().includes(token)) {
                  selectedUnitSymbol = '';
                }
              });
              const compatibleVariables = modelOutputs.filter(variable => {
                const variableUnit = units?.find(unit => unit.id === variable.unit);
                const compatibleSymbols = variableUnit?.compatible_units.map(u => u.symbol);
                return observationUnitField && selectedUnitSymbol
                  ? compatibleSymbols?.includes(selectedUnitSymbol)
                  : true;
              });
              return (
                <TableRow key={obsId}>
                  <TableCell>
                    {obsId}
                  </TableCell>
                  <TableCell>
                    <FormControl fullWidth>
                      <InputLabel id={`select-var-${obsId}-label`}>Variable</InputLabel>
                      <Select
                        labelId={`select-var-${obsId}-label`}
                        id={`select-var-${obsId}`}
                        label='Variable'
                        value={selectedVariable?.qname}
                        onChange={handleObservationChange(obsId)}
                      >
                        {compatibleVariables?.map((variable) => (
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
                      <InputLabel id={`select-unit-${obsId}-label`}>Units</InputLabel>
                      <Select
                        labelId={`select-unit-${obsId}-label`}
                        id={`select-unit-${obsId}`}
                        label='Units'
                        value={displayUnitSymbol(selectedUnitSymbol)}
                        onChange={handleUnitChange(obsId)}
                      >
                        {compatibleUnits?.map((unit) => (
                          <MenuItem
                            key={unit.id}
                            value={displayUnitSymbol(unit.symbol)}
                          >
                            {displayUnitSymbol(unit.symbol)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                </TableRow>
              )
            })
          }
        </TableBody>
      </Table>
      <Box component="div" sx={{ maxHeight: "30vh", overflow: 'auto', overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <Typography>
                  Name
                </Typography>
              </TableCell>
              <TableCell>
                <Typography>
                  Observation
                </Typography>
              </TableCell>
              <TableCell>
                <Typography>
                  Observation Unit
                </Typography>
              </TableCell>
              <TableCell>
                <Typography>
                  Mapping
                </Typography>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {observationValues.map((observation, index) => {
              const obsId = observationIds[index];
              const obsUnit = observationUnits[index];
              const obsVariable = observationVariables[index];
              return (
                <TableRow key={index}>
                  <TableCell>{obsId}</TableCell>
                  <TableCell>{observation}</TableCell>
                  <TableCell>{displayUnitSymbol(obsUnit)}</TableCell>
                  <TableCell>{obsVariable}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Box>
    </>
  )
}

export default MapObservations;

 