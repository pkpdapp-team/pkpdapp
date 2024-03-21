import { FC } from 'react';
import { Box, Select, FormControl, MenuItem, InputLabel, Table, TableHead, TableRow, TableCell, TableBody, Typography, SelectChangeEvent } from "@mui/material";
import { StepperState } from "./LoadDataStepper";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import {
  useCombinedModelListQuery,
  useProjectRetrieveQuery,
  useUnitListQuery,
  useVariableListQuery
} from "../../app/backendApi";

interface IMapObservations {
  state: StepperState;
  firstTime: boolean;
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

  const observationField = state.fields.find(
    (field, i) => state.normalisedFields[i] === 'Observation'
  ) || '';
  const observationIdField = state.fields.find(
    (field, i) => state.normalisedFields[i] === 'Observation ID'
  );
  const observationRows = observationField ? state.data.filter(row => row[observationField] !== '.') : [];
  const observationIds = observationIdField ?
    observationRows.map(row => row[observationIdField]) :
    [observationField];
  const uniqueObservationIds = [...new Set(observationIds)];
  const observationValues = observationField ?
    observationRows.map(row => row[observationField]) :
    [];
  const observationUnitField = state.fields.find(
    (field, i) => ['Observation Unit', 'Unit'].includes(state.normalisedFields[i])
  );
  const observationUnits = observationRows.map(row => row[observationUnitField || 'Observation_unit']);
  const observationVariables = observationRows.map(row => row['Observation Variable']);

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
        row['Observation Variable'] = value;
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
      <p>Map observations to variables in the model.</p>
      <Box component="div" sx={{ maxHeight: "40vh", overflow: 'auto', overflowX: 'auto' }}>
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
            {uniqueObservationIds.map((obsId) => {
              const currentRow = observationRows.find(row => observationIdField ? row[observationIdField] === obsId : true);
              const selectedVariable = variables?.find(variable => variable.qname === currentRow?.['Observation Variable']);
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
                return selectedUnitSymbol ? compatibleSymbols?.includes(selectedUnitSymbol) : true;
              });
              return (
                <TableRow>
                  <TableCell>
                    {obsId}
                  </TableCell>
                  <TableCell>
                    <FormControl>
                      <InputLabel id={`select-var-${obsId}-label`}>Variable</InputLabel>
                      <Select
                        labelId={`select-var-${obsId}-label`}
                        id={`select-var-${obsId}`}
                        label='Variable'
                        value={selectedVariable?.qname}
                        onChange={handleObservationChange(obsId)}
                      >
                        {compatibleVariables?.map((variable) => (
                          <MenuItem key={variable.name} value={variable.qname}>{variable.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>
                    {observationUnitField && selectedUnitSymbol ?
                      selectedUnitSymbol :
                      <FormControl>
                        <InputLabel id={`select-unit-${obsId}-label`}>Units</InputLabel>
                        <Select
                          labelId={`select-unit-${obsId}-label`}
                          id={`select-unit-${obsId}`}
                          label='Units'
                          value={selectedUnitSymbol || ''}
                          onChange={handleUnitChange(obsId)}
                        >
                          {compatibleUnits?.map((unit) => (
                            <MenuItem key={unit.symbol} value={unit.symbol}>{unit.symbol}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    }
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
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
                  <TableCell>{obsUnit}</TableCell>
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

 