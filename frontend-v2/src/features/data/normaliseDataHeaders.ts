const normalisation = {
  'Ignore': ['ignore'],
  'Additional Doses': ['additional doses', 'additional dose', 'addl'],
  'Administration ID': ['administration id', 'cmt', 'adm'],
  'Amount': ['amount', 'amt'],
  'Amount Unit': ['amount unit', 'amt_unit', 'amt_units', 'amtunit', 'amtunits', 'units_amt'],
  'Amount Variable': ['amount variable', 'amount_var', 'amt_var'],
  'Cat Covariate': ['cat covariate', 'cat', 'sex', 'gender', 'group', 'cohort', 'study', 'route', 'matrix'],
  'Censoring': ['cens', 'blq', 'lloq'],
  'Cont Covariate': ['cont covariate', 'weight', 'wt', 'bw', 'age', 'dose'],
  'Event ID': ['event id', 'evid'],
  'ID': ['id', 'subject', 'animal number'],
  'Ignored Observation': ['ignored observation', 'mdv'],
  'Infusion Duration': ['infusion duration', 'infusion_time', 'dur'],
  'Infusion Rate': ['infusion rate', 'rate'],
  'Interdose Interval': ['interdose interval', 'ii', 'tau', 'dosing interval'],
  'Observation': ['observation', 'dv', 'c', 'y', 'conc', 'cobs', 'obs'],
  'Observation Unit': ['observation unit', 'observation_unit', 'dv_units', 'c_units', 'y_units', 'yunit', 'cunit', 'obs_units', 'obs_unit', 'obsunit', 'units_conc'],
  'Observation ID': ['observation id', 'observation_id', 'ytype', 'dvid'],
  'Observation Variable': ['observation variable', 'observation_var'],
  'Occasion': ['occasion', 'occ'],
  'Regressor': ['x', 'regressor'],
  'Time': ['time', 't', 'ivar'],
  'Time Unit': ['time unit', 'time_unit', 'time_units', 't_units', 'tunit', 'units_time'],
  'Unit': ['unit', 'units'],
}

export const manditoryHeaders = ['Time', 'Observation']

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
    warnings.push('This CSV contains no dosing information. Dosing amounts and units can be set in Trial Design.');
  }
  if (fields.includes('Amount') && !fields.includes('Amount Unit')) {
    warnings.push('Amount units have not been defined in the dataset and need to be defined manually.');
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