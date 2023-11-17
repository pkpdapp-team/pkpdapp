
const normalisation = {
    'Additional Doses': ['Additional Doses', 'Additional Dose', 'ADDL', 'addl'],
    'Administration ID': ['Administration ID', 'Administration ID', 'CMT', 'Cmt', 'cmt', 'ADM', 'Adm', 'adm'],
    'Amount': ['Amount', 'AMT', 'Amt', 'amt' ],
    'Amount Unit': ['Amount Unit', 'AMT_unit', 'Amt_unit', 'amt_unit', 'AMT_units', 'Amt_units', 'amt_units', 'AMTunit', 'Amtunit', 'amtunit', 'AMTunits', 'Amtunits', 'amtunits'],
    'Cat Covariate': ['Cat Covariate', 'CAT', 'Cat', 'cat', 'sex', 'gender', 'group', 'cohort', 'study', 'route', 'matrix'],
    'Censoring': ['CENS', 'Cens', 'cens', 'BLQ', 'Blq', 'blq', 'LLOQ', 'LLoQ', 'lloq'],
    'Cont Covariate': ['Cont Covariate', 'WEIGHT', 'Weight', 'weight', 'WT', 'wt', 'BW', 'bw', 'AGE', 'Age', 'age', 'DOSE', 'Dose', 'dose'],
    'Event ID': ['Event ID', 'EVID'],
    'ID': ['ID', 'subject', 'animal number'],
    'Ignore': ['Ignore'],
    'Ignored Observation': ['Ignored Observation', 'MDV', 'mdv'],
    'Infusion Duration': ['Infusion Duration', 'DUR', 'dur'],
    'Infusion Rate': ['Infusion Rate', 'RATE', 'rate'],
    'Interdose Interval': ['Interdose Interval', 'II', 'tau', 'dosing interval'],
    'Observation': ['Observation', 'DV', 'dv', 'C', 'c', 'Y', 'y', 'CONC', 'Conc', 'conc', 'CObs', 'Cobs', 'OBS', 'Obs', 'obs', 'Observation', 'observation'],
    'Observation Unit': ['Observation Unit', 'DV_units', 'dv_units', 'c_units', 'C_units', 'y_units', 'Y_units', 'yunit', 'Yunit', 'yUnit', 'YUnit', 'cunit', 'Cunit', 'cUnit', 'CUnit', 'OBS_units', 'Obs_units', 'obs_units', 'OBS_unit', 'Obs_unit', 'obs_unit', 'OBSunit', 'Obsunit'],
    'Observation ID': ['Observation ID', 'YTYPE', 'ytype', 'DVID', 'dvid'],
    'Occasion': ['Occasion', 'OCC', 'Occ', 'occ'],
    'Regressor': ['Regressor', 'x', 'regressor', 'Regressor'],
    'Time': ['Time', 'time', 't', 'IVAR', 'Ivar', 'ivar'],
    'Time Unit': ['Time_units', 'time_units', 't_units', 'TUNIT', 'Tunit', 'tunit'],
}

export const manditoryHeaders = ['ID', 'Time', 'Observation', 'Administration ID', 'Amount']

export const normalisedHeaders = Object.keys(normalisation)


export const normaliseHeader = (header: string) => {
    for (const [key, value] of Object.entries(normalisation)) {
        if (value.includes(header)) {
            return key
        }
    }
    return ''
}