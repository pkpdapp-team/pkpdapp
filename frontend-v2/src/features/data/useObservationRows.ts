import { StepperState } from "./LoadDataStepper";
import { normaliseHeader } from "./normaliseDataHeaders";
import { Row } from "./LoadData";

const DEFAULT_VARIABLE_FIELD = "Observation Variable";
const DEFAULT_UNIT_FIELD = "Observation Unit";

function mergeObservationColumns(
  state: StepperState,
  observationFields: string[],
) {
  const rows: Row[] = [];
  const amountIndex = state.normalisedFields.indexOf("Amount");
  const amountField = state.fields[amountIndex];
  observationFields.forEach((field, i) => {
    const observationId = field;
    state.data.forEach((row) => {
      const value = row[field];
      const newRow: Row = {
        ...row,
        Observation: value,
        Observation_id: observationId,
      };
      if (i > 0) {
        newRow[amountField] = ".";
      }
      rows.push(newRow);
    });
  });
  rows.forEach((row) => {
    observationFields.forEach((field) => {
      delete row[field];
    });
  });
  return rows;
}

export default function useObservationRows(state: StepperState) {
  let fields = [...state.fields];
  let normalisedFields = [...state.normalisedFields];
  const observationFields =
    fields.filter((field, i) => normalisedFields[i] === "Observation") || [];
  let [observationField] = observationFields;
  let observationIdField = fields.find(
    (field, i) => state.normalisedFields[i] === "Observation ID",
  );
  let rows = state.data;
  if (observationFields.length > 1) {
    rows = mergeObservationColumns(state, observationFields);
    observationField = "Observation";
    observationIdField = "Observation_id";
    fields = Object.keys(rows[0]);
    normalisedFields = fields.map(normaliseHeader);
    state.setFields(fields);
    state.setNormalisedFields(normalisedFields);
    state.setData(rows);
  }
  const observationRows = observationField
    ? rows.filter((row) => row[observationField] !== ".")
    : [];
  const observationIds = observationIdField
    ? observationRows.map((row) => row[observationIdField || "Observation_id"])
    : [observationField];
  const observationValues = observationField
    ? observationRows.map((row) => row[observationField])
    : [];
  const observationUnitField =
    fields.find((field, i) =>
      ["Observation Unit", "Unit"].includes(normalisedFields[i]),
    ) || DEFAULT_UNIT_FIELD;
  const observationVariableField =
    fields.find((field, i) => normalisedFields[i] === "Observation Variable") ||
    DEFAULT_VARIABLE_FIELD;
  const observationUnits = observationRows.map(
    (row) => row[observationUnitField],
  );
  const observationVariables = observationRows.map(
    (row) => row[observationVariableField],
  );

  return {
    observationRows,
    observationField,
    observationIdField,
    observationUnitField,
    observationVariableField,
    observationIds,
    observationUnits,
    observationValues,
    observationVariables,
  };
}
