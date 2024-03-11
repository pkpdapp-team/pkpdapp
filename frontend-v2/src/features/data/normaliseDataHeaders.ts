
const normalisation = {
    'Additional Doses': ['additional doses', 'additional dose', 'addl'],
    'Administration ID': ['administration id', 'cmt', 'adm'],
    'Amount': ['amount', 'amt' ],
    'Amount Unit': ['amount unit', 'amt_unit', 'amt_units', 'amtunit', 'amtunits', 'units_amt'],
    'Cat Covariate': ['cat covariate', 'cat', 'sex', 'gender', 'group', 'cohort', 'study', 'route', 'matrix'],
    'Censoring': ['cens', 'blq', 'lloq'],
    'Cont Covariate': ['cont covariate', 'weight', 'wt', 'bw', 'age', 'dose'],
    'Event ID': ['event id', 'evid'],
    'ID': ['id', 'subject', 'animal number'],
    'Ignore': ['ignore'],
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

export const manditoryHeaders = ['ID', 'Time', 'Observation', 'Administration ID', 'Amount']

export const normalisedHeaders = Object.keys(normalisation)


export const normaliseHeader = (header: string) => {
    for (const [key, value] of Object.entries(normalisation)) {
        if (value.includes(header.toLowerCase())) {
            return key
        }
    }
    return ''
}