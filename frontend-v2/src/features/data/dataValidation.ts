import { Field } from "./LoadData";
import { StepperState } from "./LoadDataStepper";

const normalisation = {
  Ignore: ["ignore"],
  "Additional Doses": ["additional doses", "additional dose", "addl"],
  "Administration ID": ["administration id", "cmt", "adm"],
  "Administration Name": ["route"],
  Amount: ["amount", "amt"],
  "Amount Unit": [
    "amount unit",
    "amt_unit",
    "amt_units",
    "amtunit",
    "amtunits",
    "units_amt",
    "unit_amount",
    "unit amount",
    "amount_unit",
    "dose unit",
    "dose_unit",
    "unit dose",
    "unit_dose",
  ],
  "Amount Variable": ["amount variable", "amount_var", "amt_var"],
  "Cat Covariate": [
    "cat covariate",
    "cat",
    "sex",
    "gender",
    "group",
    "cohort",
    "study",
    "matrix",
    "species",
    "strain",
    "analyte",
  ],
  Censoring: ["cens", "blq", "lloq"],
  "Cont Covariate": ["cont covariate", "weight", "wt", "bw", "age", "dose"],
  "Event ID": ["event id", "evid"],
  "Group ID": ["group id"],
  ID: ["id", "subject", "animal number", "subject_id", "subjid"],
  "Ignored Observation": ["ignored observation", "mdv"],
  "Infusion Duration": [
    "infusion time",
    "infusion duration",
    "infusion_time",
    "dur",
    "tinf",
    "infusiontime",
  ],
  "Infusion Rate": ["infusion rate", "rate"],
  "Interdose Interval": ["interdose interval", "ii", "tau", "dosing interval"],
  Observation: [
    "observation",
    "dv",
    "y",
    "conc",
    "cobs",
    "obs",
    "concentration",
  ],
  "Observation Unit": [
    "observation unit",
    "observation_unit",
    "dv_units",
    "c_units",
    "y_units",
    "yunit",
    "cunit",
    "obs_units",
    "obs_unit",
    "obsunit",
    "units_conc",
    "unit_observation",
    "unit observation",
    "concentration unit",
    "concentration_unit",
    "unit concentration",
    "unit_concentration",
  ],
  "Observation ID": ["observation id", "observation_id", "ytype", "dvid"],
  "Observation Variable": ["observation variable", "observation_var"],
  Occasion: ["occasion", "occ"],
  Regressor: ["x", "regressor"],
  Time: ["time", "t", "ivar", "hour_actual"],
  "Time Unit": [
    "time unit",
    "time_unit",
    "time_units",
    "t_units",
    "tunit",
    "units_time",
    "unit_time",
  ],
};

export const groupedHeaders = {
  "Frequently Used": [
    "Ignore",
    "ID",
    "Time",
    "Time Unit",
    "Observation",
    "Observation Unit",
    "Amount",
    "Amount Unit",
  ],
  Dosing: [
    "Administration ID",
    "Administration Name",
    "Additional Doses",
    "Infusion Rate",
    "Infusion Duration",
    "Interdose Interval",
  ],
  Observation: ["Observation ID", "Censoring", "Ignored Observation"],
  "PKPD Model": ["Amount Variable", "Observation Variable"],
  Other: [
    "Cat Covariate",
    "Cont Covariate",
    "Event ID",
    "Group ID",
    "Occasion",
    "Regressor",
  ],
};

export const manditoryHeaders = ["Time", "Observation"];

export const normalisedHeaders = Object.keys(normalisation);

export const validateDataRow = (
  row: Record<string, string>,
  normalisedFields: Map<string, string>,
) => {
  const fields = [...normalisedFields.keys()];
  const timeField = fields.find(
    (field) => normalisedFields.get(field) === "Time",
  );

  const amountField =
    fields.find((field) => normalisedFields.get(field) === "Amount") ||
    "Amount";
  const amount = parseFloat(row[amountField]);
  const hasAmount = !isNaN(amount);

  const observationField =
    fields.find((field) => normalisedFields.get(field) === "Observation") ||
    "Observation";
  const observation = parseFloat(row[observationField]);
  const hasObservation = !isNaN(observation);

  const censorField = fields.find(
    (field) => normalisedFields.get(field) === "Censoring",
  );
  const censoredRow =
    !hasAmount && censorField && parseInt(row[censorField]) === 1;

  const mdvField = fields.find(
    (field) => normalisedFields.get(field) === "Ignored Observation",
  );
  const ignoreMDV = !hasAmount && mdvField && parseInt(row[mdvField]) === 1;

  if (!timeField) {
    return false;
  }
  if (hasObservation && censoredRow) {
    return false;
  }
  if (hasObservation && ignoreMDV) {
    return false;
  }
  const time = parseFloat(row[timeField]);
  if (isNaN(time)) {
    return false;
  }
  return true;
};

export function removeIgnoredObservations(
  row: Record<string, string>,
  normalisedFields: Map<string, string>,
) {
  const newRow = { ...row };
  const fields = [...normalisedFields.keys()];
  const censorField = fields.find(
    (field) => normalisedFields.get(field) === "Censoring",
  );
  const mdvField = fields.find(
    (field) => normalisedFields.get(field) === "Ignored Observation",
  );
  const mdv = mdvField && parseInt(row[mdvField]);
  const censoring = censorField && parseInt(row[censorField]);
  const observationField =
    fields.find((field) => normalisedFields.get(field) === "Observation") ||
    "Observation";
  if (mdv === 1 || censoring === 1) {
    newRow[observationField] = ".";
  }
  return newRow;
}

export type Group = {
  id: string;
  name: string;
  subjects: string[];
};

export function validateGroupMembers(groups: Group[]) {
  const subjectMemberships = {} as Record<string, string[]>;
  groups.forEach((group) => {
    group.subjects.forEach((subject) => {
      const subjectGroups = subjectMemberships[subject]
        ? [...subjectMemberships[subject], group.id]
        : [group.id];
      subjectMemberships[subject] = subjectGroups;
    });
  });
  return Object.values(subjectMemberships).every(
    (groups) => groups.length === 1,
  );
}

export function groupsFromCatCovariate(state: StepperState, covariate: string) {
  const idField =
    state.fields.find((field) => state.normalisedFields.get(field) === "ID") ||
    "ID";
  const columnValues = state.data.map((row) => row[covariate]);
  const uniqueColumnValues = [...new Set(columnValues)];
  const groups = uniqueColumnValues.map((value, index) => {
    const subjects = state.data
      .filter((row) => row[covariate] === value)
      .map((row) => row[idField]);
    return {
      id: value,
      name: `Group ${index + 1}`,
      subjects: [...new Set(subjects)],
    };
  });
  return groups;
}

function validateCatCovariates(state: StepperState) {
  const catCovariates = state.fields.filter(
    (field) => state.normalisedFields.get(field) === "Cat Covariate",
  );
  const validationErrors: Record<string, string> = {};
  catCovariates.forEach((covariate) => {
    const groups = groupsFromCatCovariate(state, covariate);
    if (!validateGroupMembers(groups)) {
      validationErrors[covariate] =
        `${covariate}: value is not unique for individual subjects.`;
    }
  });
  return validationErrors;
}

export function validateDosingRows(state: StepperState) {
  const amountField = state.fields.find(
    (field) => state.normalisedFields.get(field) === "Amount",
  );
  return (
    amountField !== undefined &&
    state.data.some((row) => row[amountField] !== ".")
  );
}

export const validateState = (state: StepperState) => {
  const { fields, normalisedFields, normalisedHeaders } = state;
  const errors: string[] = [];
  const hasNoDosing = !validateDosingRows(state);
  // check for mandatory fields
  for (const field of manditoryHeaders) {
    if (!normalisedHeaders.includes(field)) {
      errors.push(`${field} has not been defined`);
    }
  }

  const warnings: string[] = Object.values(validateCatCovariates(state));

  const timeField = fields.find(
    (field) => normalisedFields.get(field) === "Time",
  );
  const timeValues = timeField
    ? state.data.map((row) => parseFloat(row[timeField]))
    : [];
  const timeIsValid = timeValues.every((time) => !isNaN(time));
  const invalidTimes = timeValues.filter((time) => isNaN(time));
  if (!timeIsValid) {
    warnings.push(
      `CSV contains empty or invalid time values. ${invalidTimes.length} rows will be ignored`,
    );
  }

  const timeUnitField = fields.find(
    (field) => normalisedFields.get(field) === "Time Unit",
  );
  const timeUnitValues = timeUnitField
    ? state.data.map((row) => row[timeUnitField])
    : [];
  const uniqueTimeUnits = [...new Set(timeUnitValues)].filter(Boolean);
  if (uniqueTimeUnits.length > 1) {
    errors.push(
      `Invalid data file: file contains multiple time units: [${[...uniqueTimeUnits].join(", ")}].`,
    );
  }

  if (!normalisedHeaders.includes("ID")) {
    warnings.push(
      `ID has not been defined. Subject IDs will be assigned automatically, according to the time column,
      if time is provided in ascending order for each individual.`,
    );
  }
  if (hasNoDosing || !normalisedHeaders.includes("Amount Unit")) {
    if (hasNoDosing) {
      warnings.push(
        "This CSV contains no dosing information. Dosing amounts and units can be set in Trial Design.",
      );
    } else {
      warnings.push(
        "Amount units have not been defined in the dataset and need to be defined manually.",
      );
    }
  }
  if (
    normalisedHeaders.includes("Observation") &&
    !normalisedHeaders.includes("Observation Unit")
  ) {
    warnings.push(
      "Observation units have not been defined in the dataset and need to be defined manually.",
    );
  }
  return { errors, warnings };
};

export function normaliseHeader(header: string): [Field, string] {
  for (const [key, value] of Object.entries(normalisation)) {
    if (value.includes(header.toLowerCase())) {
      return [header, key];
    }
  }
  return [header, "Ignore"];
}
