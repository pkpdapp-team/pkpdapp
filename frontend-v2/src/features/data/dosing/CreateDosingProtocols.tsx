import { StepperState } from "../LoadDataStepper";
import { ProjectRead } from "../../../app/backendApi";
import { Row } from "../LoadData";
import { findFieldByType } from "../findFieldByType";
import { generateAdministrationIds } from "./generateAdministrationIds";

/**
 * Find the Dose or DOSEA continuous covariate field.
 * @param state stepper state
 * @returns the field name if found, otherwise undefined
 */
export function findDoseCovariateField(state: StepperState): string | undefined {
  return state.fields.find(
    (field) =>
      (field.toLowerCase() === "dose" || field.toLowerCase() === "dosea") &&
      state.normalisedFields.get(field) === "Cont Covariate"
  );
}

/**
 * Create dosing rows for each subject and dosing compartment.
 * Each row has an administration ID based on the dosing compartment and group ID.
 * @param state stepper state
 * @param administrationIdField column name for administration ID
 * @param dosingCompartments dosing compartments for the model
 * @param amountUnit amount unit for the model (either pmol or pmol/kg.)
 */
export function createDosingRows(
  state: StepperState,
  administrationIdField: string,
  dosingCompartments: string[],
  project: ProjectRead,
) {
  const idField = findFieldByType("ID", state);
  const timeField = findFieldByType("Time", state);
  const timeUnitField = findFieldByType("Time Unit", state);
  const amountField = findFieldByType("Amount", state);
  const amountUnitField = findFieldByType("Amount Unit", state);
  const perKgField = findFieldByType("Per Body Weight(kg)", state);
  const doseCovariateField = findDoseCovariateField(state);
  const covariateFields = state.fields.filter(
    (field) => state.normalisedFields.get(field) === "Cat Covariate",
  );
  const nextData = [...state.data];
  const uniqueIds = new Set(nextData.map((row) => row[idField]));
  const uniqueGroupIds = [
    ...new Set(nextData.map((row) => row[state.groupColumn])),
  ];
  const newRows: Row[] = [];
  dosingCompartments.forEach((compartment, index) => {
    uniqueIds.forEach((id) => {
      const subjectRow = state.data.find((row) => row[idField] === id);
      const groupId = subjectRow?.[state.groupColumn];
      const groupIndex = groupId ? uniqueGroupIds.indexOf(groupId) + 1 : 0;
      const adminId = index * uniqueGroupIds.length + groupIndex;
      const timeUnit = subjectRow?.[timeUnitField] || "h";
      const name = compartment.split(".")[1];
      const isHuman = project.species === "H";
      const isAvhOrAah = name == "Avh" || name == "Aah";
      const isPerKg = !isHuman && !isAvhOrAah;
      // Use Dose/DOSEA continuous covariate value if available, otherwise default to "0"
      const doseAmount = doseCovariateField && subjectRow?.[doseCovariateField]
        ? subjectRow[doseCovariateField]
        : "0";
      const newRow: Row = {
        [idField]: id,
        [administrationIdField]: adminId.toString(),
        "Amount Variable": compartment,
        [amountUnitField]: "mg",
        [perKgField]: isPerKg ? "1" : "0",
        [amountField]: doseAmount,
        [timeField]: "0",
        [timeUnitField]: timeUnit,
        "Infusion Duration": "0.0833",
        "Additional Doses": ".",
        "Interdose Interval": ".",
      };
      if (groupId) {
        newRow["Group ID"] = groupId;
        newRow[state.groupColumn] = groupId;
      }
      covariateFields.forEach((field) => {
        newRow[field] = subjectRow?.[field] || "";
      });
      newRows.push(newRow);
    });
  });
  newRows.sort((a, b) => parseInt(a[idField]) - parseInt(b[idField]));
  return {
    dosingRows: newRows,
    normalisedFields: new Map([
      ...state.normalisedFields.entries(),
      ["Administration ID", administrationIdField],
      ["Amount", amountField],
      ["Amount Variable", "Amount Variable"],
      ["Amount Unit", amountUnitField],
      ["Per Body Weight(kg)", perKgField],
      ["Infusion Duration", "Infusion Duration"],
      ["Additional Doses", "Additional Doses"],
      ["Interdose Interval", "Interdose Interval"],
    ]),
  };
}

export function normaliseCSVData(
  state: StepperState,
  administrationIdField: string,
  dosingCompartments: string[],
  project: ProjectRead,
) {
  const amountField = state.fields.find(
    (field) =>
      field === "Amount" || state.normalisedFields.get(field) === "Amount",
  );
  const groupIdField = findFieldByType("Group ID", state);

  let _data = state.data;
  let _normalisedFields = state.normalisedFields;
  // ignore rows with no amount and administration ID set to 0.
  const dosingRows = (data: Row[]) =>
    data.filter((row) => parseInt(row[administrationIdField]));

  if (!amountField) {
    const newNormalisedFields = new Map([
      ..._normalisedFields.entries(),
      ["Amount", "Amount"],
    ]);
    const newData = _data.map((row) => ({ ...row, Amount: "." }));
    _normalisedFields = newNormalisedFields;
    _data = newData;
  }

  if (!dosingRows(_data).length) {
    const { dosingRows: newDosingRows, normalisedFields: newNormalisedFields } =
      createDosingRows(
        state,
        administrationIdField,
        dosingCompartments,
        project,
      );
    _data = [..._data, ...newDosingRows];
    _normalisedFields = newNormalisedFields;
  }

  const missingAdministrationIds = dosingRows(_data).some(
    (row) => !(administrationIdField in row),
  );
  if (missingAdministrationIds) {
    generateAdministrationIds(
      dosingRows(_data),
      administrationIdField,
      groupIdField,
    );
  }
  if (_data === state.data && _normalisedFields === state.normalisedFields) {
    return state;
  }
  return { data: _data, normalisedFields: _normalisedFields };
}
