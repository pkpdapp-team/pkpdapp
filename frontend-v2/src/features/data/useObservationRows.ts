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
  const amountField =
    state.fields.find(
      (field) => state.normalisedFields.get(field) === "Amount",
    ) || "Amount";
  observationFields.forEach((field, i) => {
    const observationId = field;
    state.data.forEach((row) => {
      const value = row[field];
      const newRow: Row = {
        ...row,
        Observation: value,
        "Observation ID": observationId,
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

export default function useObservationRows(state: StepperState, tab: string) {
  const fields = state.fields;
  let normalisedFields = state.normalisedFields;
  const observationFields =
    fields.filter((field) => normalisedFields.get(field) === "Observation") ||
    [];
  let [observationField] = observationFields;
  let observationIdField = fields.find(
    (field) => state.normalisedFields.get(field) === "Observation ID",
  );
  let rows = state.data;
  if (observationFields.length > 1) {
    rows = mergeObservationColumns(state, observationFields);
    observationField = "Observation";
    observationIdField = "Observation ID";
    const mergedFields = Object.keys(rows[0]);
    normalisedFields = new Map(
      mergedFields.map((field) =>
        state.normalisedFields.has(field)
          ? [field, state.normalisedFields.get(field)]
          : normaliseHeader(field),
      ),
    ) as Map<string, string>;
    normalisedFields.set("Observation", "Observation");
    normalisedFields.set("Observation ID", "Observation ID");
    state.setNormalisedFields(normalisedFields);
    state.setData(rows);
  }
  const observationRows = observationField
    ? rows.filter(
        (row) => row["Group ID"] === tab && row[observationField] !== ".",
      )
    : [];
  const observationIds = observationIdField
    ? observationRows.map((row) => row[observationIdField || "Observation ID"])
    : [observationField];
  const observationUnitField =
    fields.find((field) =>
      ["Observation Unit", "Unit"].includes(normalisedFields.get(field) || ""),
    ) || DEFAULT_UNIT_FIELD;
  const observationVariableField =
    fields.find(
      (field) => normalisedFields.get(field) === "Observation Variable",
    ) || DEFAULT_VARIABLE_FIELD;
  const observationUnits = observationRows.map(
    (row) => row[observationUnitField],
  );
  const observationVariables = observationRows.map(
    (row) => row[observationVariableField],
  );

  return {
    observationRows: observationRows.map((row, index) => ({
      ...row,
      id: index,
    })),
    observationField,
    observationIdField,
    observationUnitField,
    observationVariableField,
    observationIds,
    observationUnits,
    observationVariables,
  };
}
