import { ChangeEvent, FC, useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import {
  Alert,
  Box,
  Select,
  FormControl,
  MenuItem,
  InputLabel,
  Tab,
  Tabs,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Typography,
  SelectChangeEvent,
  Stack,
} from "@mui/material";
import { StepperState } from "./LoadDataStepper";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import {
  UnitListApiResponse,
  useCombinedModelListQuery,
  useProjectRetrieveQuery,
  useUnitListQuery,
  useVariableListQuery,
} from "../../app/backendApi";
import useObservationRows from "./useObservationRows";
import { validateState } from "./dataValidation";

interface IMapObservations {
  state: StepperState;
  firstTime: boolean;
}

function displayUnitSymbol(symbol: string | undefined) {
  return symbol === "" ? "dimensionless" : symbol;
}

/**
 * check that every row with an observation variable has a valid unit symbol.
 * @param state
 * @param {string} observationVariableField
 * @param {string} observationUnitField
 * @param units
 * @returns {boolean}
 */
function validateUnitSymbol(
  state: StepperState,
  observationVariableField: string,
  observationUnitField: string,
  units: UnitListApiResponse,
) {
  const observationRows = state.data.filter(
    (row) => !!row[observationVariableField],
  );
  const dataUnits = observationRows.map((row) => row[observationUnitField]);
  const validSymbols = [...units.map((unit) => unit.symbol), "dimensionless"];
  let validUnit = true;
  dataUnits.forEach((unit) => {
    validUnit = validUnit && validSymbols.includes(unit);
  });
  return validUnit;
}

const MapObservations: FC<IMapObservations> = ({ state }: IMapObservations) => {
  const [tab, setTab] = useState(0);
  const groupIDs = [...new Set(state.data.map((row) => row["Group ID"]))];
  const selectedGroup = groupIDs[tab];
  const projectId = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const projectIdOrZero = projectId || 0;
  const { data: project } = useProjectRetrieveQuery(
    { id: projectId || 0 },
    { skip: !projectId },
  );
  const { data: models = [] } = useCombinedModelListQuery(
    { projectId: projectIdOrZero },
    { skip: !projectId },
  );
  const [model] = models;
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
    observationUnits,
    observationVariables,
  } = useObservationRows(state, selectedGroup);
  const uniqueObservationIds = [...new Set(observationIds)];

  const filterOutputs = model?.is_library_model
    ? ["environment.t", "PDCompartment.C_Drug"]
    : [];
  const modelOutputs =
    variables?.filter(
      (variable) =>
        !variable.constant && !filterOutputs.includes(variable.qname),
    ) || [];

  const handleObservationChange =
    (id: string) => (event: SelectChangeEvent) => {
      const nextData = [...state.data];
      const { value } = event.target;
      const selectedVariable = variables?.find(
        (variable) => variable.qname === value,
      );
      const compatibleUnits = units
        ?.find((unit) => unit.id === selectedVariable?.unit)
        ?.compatible_units.map((unit) => unit.symbol);
      let validUnit = validateUnitSymbol(
        state,
        observationVariableField,
        observationUnitField,
        units as UnitListApiResponse,
      );
      nextData
        .map((row) => {
          row[observationVariableField] = row[observationVariableField] || "";
          row[observationUnitField] = row[observationUnitField] || "";
          return row;
        })
        .filter((row) =>
          observationIdField ? row[observationIdField] === id : true,
        )
        .forEach((row) => {
          row[observationVariableField] = value;
          validUnit =
            validUnit && !!compatibleUnits?.includes(row[observationUnitField]);
        });
      const newNormalisedFields = new Map([
        ...state.normalisedFields.entries(),
        [observationVariableField, "Observation Variable"],
        [observationUnitField, "Observation Unit"],
      ]);
      state.setData(nextData);
      state.setNormalisedFields(newNormalisedFields);
      const { errors, warnings } = validateState({
        ...state,
        data: nextData,
        normalisedFields: newNormalisedFields,
      });
      if (!validUnit) {
        errors.push("Mapped observation variables must have units.");
      }
      state.setErrors(errors);
      state.setWarnings(warnings);
    };
  const handleUnitChange = (id: string) => (event: SelectChangeEvent) => {
    const nextData = [...state.data];
    const { value } = event.target;
    nextData
      .filter((row) =>
        observationIdField ? row[observationIdField] === id : true,
      )
      .forEach((row) => {
        row[observationUnitField] = value;
      });
    state.setData(nextData);
    const { errors, warnings } = validateState({
      ...state,
      data: nextData,
      normalisedFields: new Map([
        ...state.normalisedFields.entries(),
        ["Observation Unit", "Observation Unit"],
      ]),
    });
    const validUnit = validateUnitSymbol(
      { ...state, data: nextData },
      observationVariableField,
      observationUnitField,
      units as UnitListApiResponse,
    );
    if (!validUnit) {
      errors.push("Mapped observation variables must have units.");
    }
    state.setErrors(errors);
    state.setWarnings(warnings);
  };

  function handleTabChange(event: ChangeEvent<{}>, newValue: number) {
    setTab(newValue);
  }

  function a11yProps(index: number) {
    return {
      id: `group-tab-${index}`,
      "aria-controls": `group-tabpanel`,
    };
  }

  const columns = [
    "ID",
    "Observation ID",
    "Observation",
    "Observation Unit",
    "Time",
    "Observation Variable",
  ].map((normalisedField) => {
    const field =
      state.fields.find(
        (field) => state.normalisedFields.get(field) === normalisedField,
      ) || normalisedField;
    return {
      field,
      header: field,
      minWidth:
        field.endsWith("_var") || field.endsWith("Variable")
          ? 150
          : field.length > 10
            ? 130
            : 30,
    };
  });

  return (
    <>
      <Alert severity="info">Map observations to variables in the model.</Alert>
      <Stack marginTop={2} spacing={2}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <Typography>{observationIdField}</Typography>
              </TableCell>
              <TableCell>
                <Typography>Observation</Typography>
              </TableCell>
              <TableCell>
                <Typography>Unit</Typography>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {uniqueObservationIds
              .sort((a, b) => (a > b ? 1 : -1))
              .map((obsId) => {
                const currentRow = observationIds.indexOf(obsId);
                const obsVariable = observationVariables[currentRow];
                const obsUnit = observationUnits[currentRow];
                const selectedVariable = variables?.find(
                  (variable) => variable.qname === obsVariable,
                );
                let selectedUnitSymbol = units?.find(
                  (unit) => unit.symbol === obsUnit,
                )?.symbol;
                const compatibleUnits = selectedVariable
                  ? units?.find((unit) => unit.id === selectedVariable?.unit)
                      ?.compatible_units
                  : units;
                ["%", "fraction", "ratio"].forEach((token) => {
                  if (selectedUnitSymbol?.toLowerCase().includes(token)) {
                    selectedUnitSymbol = "";
                  }
                });
                return (
                  <TableRow key={obsId}>
                    <TableCell>{obsId}</TableCell>
                    <TableCell>
                      <FormControl fullWidth>
                        <InputLabel id={`select-var-${obsId}-label`}>
                          Variable
                        </InputLabel>
                        <Select
                          labelId={`select-var-${obsId}-label`}
                          id={`select-var-${obsId}`}
                          label="Variable"
                          value={selectedVariable?.qname}
                          onChange={handleObservationChange(obsId)}
                        >
                          {modelOutputs?.map((variable) => (
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
                        <InputLabel id={`select-unit-${obsId}-label`}>
                          Units
                        </InputLabel>
                        <Select
                          labelId={`select-unit-${obsId}-label`}
                          id={`select-unit-${obsId}`}
                          label="Units"
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
                );
              })}
          </TableBody>
        </Table>
        <Tabs value={tab} onChange={handleTabChange}>
          {groupIDs.map((groupID, index) => (
            <Tab
              key={groupID}
              label={`Group ${groupID}`}
              {...a11yProps(index)}
            />
          ))}
        </Tabs>
        <Box
          role="tabpanel"
          id="group-tabpanel"
          component="div"
          sx={{ maxHeight: "30vh", overflow: "auto", overflowX: "auto" }}
        >
          <DataGrid rows={observationRows} columns={columns} />
        </Box>
      </Stack>
    </>
  );
};

export default MapObservations;
