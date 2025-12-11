import { FC, SyntheticEvent, useEffect, useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import {
  Box,
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
  TableContainer,
} from "@mui/material";
import { StepperState } from "../LoadDataStepper";
import { useSelector } from "react-redux";
import { RootState } from "../../../app/store";
import {
  UnitListApiResponse,
  useCombinedModelListQuery,
  useProjectRetrieveQuery,
  useUnitListQuery,
  useVariableListQuery,
} from "../../../app/backendApi";
import useObservationRows from "./useObservationRows";
import { validateState } from "../dataValidation";
import {
  calculateTableHeights,
  DOUBLE_TABLE_FIRST_BREAKPOINTS,
  DOUBLE_TABLE_SECOND_BREAKPOINTS,
  getTableHeight,
} from "../../../shared/calculateTableHeights";
import { TableHeader } from "../../../components/TableHeader";
import { groupDataRows } from "../stratification/Stratification";
import { ObservationIDRow } from "./ObservationIDRow";

interface IMapObservations {
  state: StepperState;
  firstTime: boolean;
  notificationsInfo: {
    isOpen: boolean;
    count: number;
  };
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

export function useApiQueries() {
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

  return { model, variables, units };
}

function findFieldByType(name: string, state: StepperState) {
  return (
    state.fields.find((field) => state.normalisedFields.get(field) === name) ||
    name
  );
}

const MapObservations: FC<IMapObservations> = ({
  state,
  notificationsInfo,
}: IMapObservations) => {
  const [tab, setTab] = useState(0);
  const groupIDs = [...new Set(state.data.map((row) => row["Group ID"]))];
  const selectedGroup = groupIDs[tab];
  const perKgField = findFieldByType("Per Body Weight(kg)", state);

  const { variables, units } = useApiQueries();

  const {
    observationRows,
    observationField,
    observationIdField,
    observationUnitField,
    observationVariableField,
    observationIds,
    observationUnits,
    observationVariables,
  } = useObservationRows(state, selectedGroup);
  const uniqueObservationIds = [...new Set(observationIds)];

  useEffect(() => {
    const [firstRow] = state.data;
    if (!firstRow["Group ID"]) {
      const newData = groupDataRows(state.data, state.groupColumn);
      state.data = newData;
      state.normalisedFields = new Map([
        ...state.normalisedFields.entries(),
        ["Group ID", "Group ID"],
      ]);
    }
  }, [state]);

  if (!variables || !units) {
    return <Typography>Loading...</Typography>;
  }

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
          observationIdField
            ? row[observationIdField] === id
            : observationField in row && row[observationField] !== ".",
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
        [perKgField, "Per Body Weight(kg)"],
      ]);
      state.data = nextData;
      state.normalisedFields = newNormalisedFields;
      const { errors, warnings } = validateState({
        ...state,
        data: nextData,
        normalisedFields: newNormalisedFields,
      });
      if (!validUnit) {
        errors.push("Mapped observation variables must have units.");
      }
      state.errors = errors;
      state.warnings = warnings;
    };
  const handleUnitChange = (id: string) => (symbol: string) => {
    const nextData = [...state.data];
    nextData
      .filter((row) =>
        observationIdField ? row[observationIdField] === id : true,
      )
      .forEach((row) => {
        row[observationUnitField] = symbol;
      });
    state.data = nextData;
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
    state.errors = errors;
    state.warnings = warnings;
  };

  function handleTabChange(
    event: SyntheticEvent<Element, Event>,
    newValue: number,
  ) {
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
      <TableHeader
        label="Observations"
        tooltip="Observation units have not been defined in the dataset and need to be
        defined manually."
      />
      <Stack>
        <TableContainer
          sx={{
            maxHeight: calculateTableHeights({
              baseHeight: getTableHeight({
                steps: DOUBLE_TABLE_FIRST_BREAKPOINTS,
              }),
              isOpen: notificationsInfo.isOpen,
              count: notificationsInfo.count,
              splitMode: "first",
            }),
            transition: "all .35s ease-in",
          }}
        >
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: "15rem" }}>
                  <Typography>
                    {observationIdField || "Observation ID"}
                  </Typography>
                </TableCell>
                <TableCell sx={{ width: "15rem" }}>
                  <Typography>Observation</Typography>
                </TableCell>
                <TableCell>
                  <Typography>Unit</Typography>
                </TableCell>
                <TableCell>
                  <Typography>Per Body Weight(kg)</Typography>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {uniqueObservationIds
                .sort((a, b) => (a > b ? 1 : -1))
                .map((obsId) => {
                  const currentRow = observationIds.indexOf(obsId);
                  const obsVariable = variables?.find(
                    (variable) =>
                      variable.qname === observationVariables[currentRow],
                  );
                  const obsUnit = units.find(
                    (unit) => unit.symbol === observationUnits[currentRow],
                  );
                  return (
                    <ObservationIDRow
                      key={obsVariable?.qname}
                      obsId={obsId}
                      obsVariable={obsVariable}
                      obsUnit={obsUnit}
                      handleObservationChange={handleObservationChange(obsId)}
                      handleUnitChange={handleUnitChange(obsId)}
                    />
                  );
                })}
            </TableBody>
          </Table>
        </TableContainer>
        <TableHeader label="Groups" />
        <Tabs value={tab} onChange={handleTabChange} selectionFollowsFocus>
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
          sx={{
            height: calculateTableHeights({
              baseHeight: getTableHeight({
                steps: DOUBLE_TABLE_SECOND_BREAKPOINTS,
              }),
              isOpen: notificationsInfo.isOpen,
              count: notificationsInfo.count,
              splitMode: "second",
            }),
            overflow: "auto",
            overflowX: "auto",
            transition: "all .35s ease-in",
          }}
        >
          <DataGrid
            aria-labelledby={`group-tab-${tab}`}
            density="compact"
            rows={observationRows}
            columns={columns}
          />
        </Box>
      </Stack>
    </>
  );
};

export default MapObservations;
