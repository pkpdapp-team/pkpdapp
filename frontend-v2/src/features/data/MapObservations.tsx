import { FC } from 'react';
import { Box, Select, FormControl, MenuItem, InputLabel, Stack, Table, TableHead, TableRow, TableCell, TableBody, Typography, SelectChangeEvent } from "@mui/material";
import { Field, Data } from "./LoadData";
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

const MapObservations: FC<IMapObservations> = ({state, firstTime}: IMapObservations) => {
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
  const [ model ] = models;
  const { data: variables } = useVariableListQuery(
    { dosedPkModelId: model?.id || 0 },
    { skip: !model?.id },
  );
  const { data: units, isLoading: isLoadingUnits } = useUnitListQuery(
    { compoundId: project?.compound },
    { skip: !project || !project.compound },
  );

  const observationField = state.fields.find(
    (field, i) => state.normalisedFields[i] === 'Observation'
  ) || '';
  const observationValues = observationField ?
    state.data.map(row => row[observationField]) :
    [];
  const observationUnitField = state.fields.find(
    (field, i) => state.normalisedFields[i] === 'Observation Unit'
  );
  const observationUnits = observationUnitField ?
    state.data.map(row => row[observationUnitField]) :
    [];
  const filterOutputs = model?.is_library_model
    ? ["environment.t", "PDCompartment.C_Drug"]
    : [];
  const modelOutputs =
    variables?.filter(
      (variable) =>
        !variable.constant && !filterOutputs.includes(variable.qname),
    ) || [];

  const selectedVariable = variables?.find(variable => variable.qname === state.observationVariables?.[observationField]);
  const compatibleUnits = units?.find((unit) => unit.id === selectedVariable?.unit)?.compatible_units;

  const handleObservationChange = (field: string) => (event: SelectChangeEvent) => {
    const { value } = event.target;
    state.setObservationVariables({
      ...state.observationVariables,
      [field]: value
    });
    const selectedVariable = variables?.find(variable => variable.qname === value);
    const defaultUnit = units?.find(unit => unit.id === selectedVariable?.unit);
    state.setObservationUnits({
      ...state.observationUnits,
      [field]: defaultUnit?.symbol || ''
    });
  }
  const handleUnitChange = (field: string) => (event: SelectChangeEvent) => {
    const { value } = event.target;
    state.setObservationUnits({
      ...state.observationUnits,
      [field]: value
    });
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
                <FormControl>
                  <InputLabel id={`select-var-label`}>Variable</InputLabel>
                  <Select
                    labelId={`select-var-label`}
                    id={`select-var`}
                    label='Variable'
                    value={state.observationVariables?.[observationField]}
                    onChange={handleObservationChange(observationField)}
                  >
                    {modelOutputs?.map((variable) => (
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
                    value={state.observationUnits?.[observationField]}
                    onChange={handleUnitChange(observationField)}
                  >
                    {compatibleUnits?.map((unit) => (
                      <MenuItem key={unit.symbol} value={unit.symbol}>{unit.symbol}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {observationValues.map((observation, index) => (
              <TableRow key={index}>
                <TableCell>{observationField}</TableCell>
                <TableCell>{observation}</TableCell>
                <TableCell>{observationUnits[index]}</TableCell>
                <TableCell>
                  {state.observationVariables?.[observationField]}
                  [{state.observationUnits?.[observationField]}]
                  </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </>
  )
}

export default MapObservations;

 