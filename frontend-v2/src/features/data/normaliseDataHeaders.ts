const normalisation = {
  'Ignore': ['ignore'],
  'Additional Doses': ['additional doses', 'additional dose', 'addl'],
  'Administration ID': ['administration id', 'cmt', 'adm'],
  'Amount': ['amount', 'amt'],
  'Amount Unit': ['amount unit', 'amt_unit', 'amt_units', 'amtunit', 'amtunits', 'units_amt'],
  'Cat Covariate': ['cat covariate', 'cat', 'sex', 'gender', 'group', 'cohort', 'study', 'route', 'matrix'],
  'Censoring': ['cens', 'blq', 'lloq'],
  'Cont Covariate': ['cont covariate', 'weight', 'wt', 'bw', 'age', 'dose'],
  'Event ID': ['event id', 'evid'],
  'ID': ['id', 'subject', 'animal number'],
  'Ignored Observation': ['ignored observation', 'mdv'],
  'Infusion Duration': ['infusion duration', 'dur'],
  'Infusion Rate': ['infusion rate', 'rate'],
  'Interdose Interval': ['interdose interval', 'ii', 'tau', 'dosing interval'],
  'Observation': ['observation', 'dv', 'c', 'y', 'conc', 'cobs', 'obs'],
  'Observation Unit': ['observation unit', 'dv_units', 'c_units', 'y_units', 'yunit', 'cunit', 'obs_units', 'obs_unit', 'obsunit', 'units_conc'],
  'Observation ID': ['observation id', 'ytype', 'dvid'],
  'Occasion': ['occasion', 'occ'],
  'Regressor': ['x', 'regressor'],
  'Time': ['time', 't', 'ivar'],
  'Time Unit': ['time_unit', 'time_units', 't_units', 'tunit', 'units_time'],
  'Unit': ['unit', 'units'],
}

export const manditoryHeaders = ['Time', 'Observation', 'Time Unit']

export const normalisedHeaders = Object.keys(normalisation)

export const validateNormalisedFields = (fields: string[]) => {
  const errors: string[] = [];
  // check for mandatory fields
  for (const field of manditoryHeaders) {
    if (!fields.includes(field)) {
      errors.push(`${field} has not been defined`);
    }
  }
  const warnings: string[] = [];
  if (!fields.includes('ID')) {
    warnings.push(
      `ID has not been defined. Subject IDs will be assigned automatically, according to the time column,
      if time is provided in ascending order for each individual.`
    );
  }
  if (!fields.includes('Amount')) {
    warnings.push('Amount has not been defined. Dosing amounts can be set in Trial Design.');
  }
  if (!fields.includes('Amount Unit')) {
    warnings.push('Amount Unit has not been defined. Dosing units can be set in Trial Design.');
  }
  if (fields.includes('Observation') && !fields.includes('Observation Unit')) {
    warnings.push('Observation units have not been defined in the dataset and need to be defined manually.');
  }
  return { errors, warnings };
}
export const normaliseHeader = (header: string) => {
  for (const [key, value] of Object.entries(normalisation)) {
    if (value.includes(header.toLowerCase())) {
      return key
    }
  }
  return ''
}