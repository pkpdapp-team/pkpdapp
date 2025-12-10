import { StepperState } from "../LoadDataStepper";
import { normalisedFieldsFromData } from "../dataValidation";
import { Row } from "../LoadData";

const DEFAULT_VARIABLE_FIELD = "Observation Variable";
const DEFAULT_UNIT_FIELD = "Observation Unit";

type ObservationRow = Row & {
  id: number;
};

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
  const { normalisedFields } = state;
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
    const newNormalisedFields = normalisedFieldsFromData(
      rows,
      state.normalisedFields,
    );
    newNormalisedFields.set("Observation", "Observation");
    newNormalisedFields.set("Observation ID", "Observation ID");
    state.normalisedFields = newNormalisedFields;
    state.data = rows;
  }
  const observationRows = observationField
    ? rows.filter(
        (row) =>
          row["Group ID"] === tab &&
          observationField in row &&
          row[observationField] !== ".",
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
  const observationRowsWithIds = observationRows.map((row, index) => ({
    ...row,
    id: index,
  })) as ObservationRow[];

  return {
    observationRows: observationRowsWithIds,
    observationField,
    observationIdField,
    observationUnitField,
    observationVariableField,
    observationIds,
    observationUnits,
    observationVariables,
  };
}
