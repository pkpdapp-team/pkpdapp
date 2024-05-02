import { StepperState } from "./LoadDataStepper";
import { normaliseHeader } from "./normaliseDataHeaders";
import { Row } from "./LoadData";

function mergeObservationColumns(state: StepperState, observationFields: string[]) {
  const rows: Row[] = [];
  observationFields.forEach((field, i) => {
    const observationId = `${i + 1}`;
    state.data.forEach(row => {
      const value = row[field];
      const newRow = { ...row, Observation: value, Observation_id: observationId };
      rows.push(newRow);
    });
  });
  rows.forEach(row => {
    observationFields.forEach(field => {
      delete row[field];
    });
  });
  return rows;
}

export default function useObservationRows(state: StepperState) {
  let fields = [...state.fields];
  let normalisedFields = [...state.normalisedFields];
  const observationFields = fields.filter(
    (field, i) => normalisedFields[i] === 'Observation'
  ) || [];
  let [observationField] = observationFields;
  let observationIdField = fields.find(
    (field, i) => state.normalisedFields[i] === 'Observation ID'
  );
  let rows = state.data;
  if (observationFields.length > 1) {
    rows = mergeObservationColumns(state, observationFields);
    observationField = 'Observation';
    observationIdField = 'Observation_id';
    fields = Object.keys(rows[0]);
    normalisedFields = fields.map(normaliseHeader);
    state.setFields(fields);
    state.setNormalisedFields(normalisedFields);
    state.setData(rows);
  }
  const observationRows = observationField ? rows.filter(row => row[observationField] !== '.') : [];
  const observationIds = observationIdField ?
    observationRows.map(row => row[observationIdField || 'Observation_id']) :
    [observationField];
  const uniqueObservationIds = [...new Set(observationIds)];
  const observationValues = observationField ?
    observationRows.map(row => row[observationField]) :
    [];
  const observationUnitField = fields.find(
    (field, i) => ['Observation Unit', 'Unit'].includes(normalisedFields[i])
  );
  const observationVariableField = fields.find(
    (field, i) => normalisedFields[i] === 'Observation Variable'
  );
  const observationUnits = observationRows.map(row => row[observationUnitField || 'Observation_unit']);
  const observationVariables = observationRows.map(row => row[observationVariableField || 'Observation Variable']);

  return {
    observationRows,
    observationField,
    observationIdField,
    observationUnitField,
    observationVariableField,
    observationIds,
    uniqueObservationIds,
    observationUnits,
    observationValues,
    observationVariables
  }
}