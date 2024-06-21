import { StepperState } from "./LoadDataStepper";

const normalisation = {
  Ignore: ["ignore"],
  "Additional Doses": ["additional doses", "additional dose", "addl"],
  "Administration ID": ["administration id", "cmt", "adm"],
  Amount: ["amount", "amt"],
  "Amount Unit": [
    "amount unit",
    "amt_unit",
    "amt_units",
    "amtunit",
    "amtunits",
    "units_amt",
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
    "route",
    "matrix",
  ],
  Censoring: ["cens", "blq", "lloq"],
  "Cont Covariate": ["cont covariate", "weight", "wt", "bw", "age", "dose"],
  "Event ID": ["event id", "evid"],
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
  ],
  "Observation ID": ["observation id", "observation_id", "ytype", "dvid"],
  "Observation Variable": ["observation variable", "observation_var"],
  Occasion: ["occasion", "occ"],
  Regressor: ["x", "regressor"],
  Time: ["time", "t", "ivar"],
  "Time Unit": [
    "time unit",
    "time_unit",
    "time_units",
    "t_units",
    "tunit",
    "units_time",
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
    "Occasion",
    "Regressor",
  ],
};

export const manditoryHeaders = ["Time", "Observation"];

export const normalisedHeaders = Object.keys(normalisation);

export const validateDataRow = (
  row: Record<string, string>,
  normalisedFields: string[],
  fields: string[],
) => {
  const timeField = fields.find((field, i) => normalisedFields[i] === "Time");
  const censorField = fields.find((field, i) => normalisedFields[i] === "Censoring");
  const mdvField = fields.find((field, i) => normalisedFields[i] === "Ignored Observation");
  if (!timeField) {
    return false;
  }
  if (censorField && parseInt(row[censorField]) === 1) {
    return false;
  }
  if (mdvField && parseInt(row[mdvField]) === 1) {
    return false;
  }
  const time = parseFloat(row[timeField]);
  if (isNaN(time)) {
    return false;
  }
  return true;
};

export const validateState = (state: StepperState) => {
  const { fields, normalisedFields } = state;
  const errors: string[] = [];
  const hasNoDosing =
    !normalisedFields.includes("Amount") ||
    state.data.every((row) => row["Amount"] === ".");
  // check for mandatory fields
  for (const field of manditoryHeaders) {
    if (!normalisedFields.includes(field)) {
      errors.push(`${field} has not been defined`);
    }
  }

  const warnings: string[] = [];

  const timeField = fields.find((field, i) => normalisedFields[i] === "Time");
  const timeValues = timeField
    ? state.data.map((row) => parseFloat(row[timeField]))
    : [];
  const timeIsValid = timeValues.every((time) => !isNaN(time));
  const invalidTimes = timeValues.filter((time) => isNaN(time));
  if (!timeIsValid) {
    warnings.push(
      `CSV contains empty or invalid Time values. ${invalidTimes.length} rows will be ignored`,
    );
  }

  if (!normalisedFields.includes("ID")) {
    warnings.push(
      `ID has not been defined. Subject IDs will be assigned automatically, according to the time column,
      if time is provided in ascending order for each individual.`,
    );
  }
  if (hasNoDosing || !normalisedFields.includes("Amount Unit")) {
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
    normalisedFields.includes("Observation") &&
    !normalisedFields.includes("Observation Unit")
  ) {
    warnings.push(
      "Observation units have not been defined in the dataset and need to be defined manually.",
    );
  }
  return { errors, warnings };
};
export const normaliseHeader = (header: string) => {
  for (const [key, value] of Object.entries(normalisation)) {
    if (value.includes(header.toLowerCase())) {
      return key;
    }
  }
  return "Ignore";
};
