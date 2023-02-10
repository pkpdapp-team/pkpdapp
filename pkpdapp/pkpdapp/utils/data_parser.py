import pandas as pd
from pkpdapp.models import Unit
from io import StringIO



 
class DataParser:
    alternate_names = {
        "ID": ["ID", "Subject_id", "Subject", "SUBJID"],
        "TIME": ["Time", "TIME"],
        "TIME_UNIT": ["Time_unit", "Time_units", "TIMEUNIT"],
        "AMOUNT": ["Amt", "Amount", "AMT"],
        "AMOUNT_UNIT": ["Amt_unit", "Amt_units", "AMTUNIT"],
        "OBSERVATION": ["DV", "Observation", "Y", "YVAL"],
        "OBSERVATION_NAME": ["Observation_id", "YTYPE", "YNAME"],
        "OBSERVATION_UNIT": ["Observation_unit", "YDESC", "YUNIT"],
        "DOSE_GROUP": ["Dose_cat", "Dose_group", "DOSEGROUP"],
    }

    required_cols = [
        "ID",
        "TIME",
        "AMOUNT",
        "OBSERVATION",
    ]

    optional_cols = [
        "DOSE_GROUP",
        "TIME_UNIT",
        "AMOUNT_UNIT",
        "OBSERVATION_UNIT",
        "OBSERVATION_NAME",
    ]

    altername_unit_names = {
        "h": "hour",
        "d": "day",
    }

    def validate(self, data: pd.DataFrame):
        colnames = data.columns.astype(str).tolist()

        # check that all required columns are present
        error_cols = []
        found_cols = {}
        for col_name in self.required_cols:
            col_alts = self.alternate_names[col_name]
            found = False
            for alternate_name in col_alts:
                if alternate_name in colnames:
                    found_cols[col_name] = alternate_name
                    found = True
                    break
            if not found:
                error_cols.append(col_name)
    
        if len(error_cols) > 0:
            raise RuntimeError(
                (
                    'Error parsing file, '
                    'does not have the following columns: {}'
                ).format(error_cols)
            )

        # search for optional columns
        for col_name in self.optional_cols:
            col_alts = self.alternate_names[col_name]
            for alternate_name in col_alts:
                if alternate_name in colnames:
                    found_cols[col_name] = alternate_name
                    break

        # set dataframe column names to standard names
        inv_found_cols = {v: k for k, v in found_cols.items()}
        data = data.rename(columns=inv_found_cols)


        # map alternate unit names to standard names
        inv_altername_unit_names = {
            v: k for k, v in self.altername_unit_names.items()
        }
        def map_unit_names(x):
            if x in inv_altername_unit_names:
                return inv_altername_unit_names[x]
            else:
                return x
        for unit_col in ["TIME_UNIT", "AMOUNT_UNIT", "OBSERVATION_UNIT"]:
            if unit_col in found_cols:
                data[unit_col] = data[unit_col].map(map_unit_names)

        # check that units are in database
        for unit_col in ["TIME_UNIT", "AMOUNT_UNIT", "OBSERVATION_UNIT"]:
            if unit_col in found_cols:
                units = data[unit_col].unique().tolist()
                pkpdapp_units = Unit.objects.all()
                pkpdapp_units_symbols = \
                    pkpdapp_units.values_list('symbol', flat=True)
                error_units = set([
                    u for u in units
                    if u not in pkpdapp_units_symbols
                ])
                if len(error_units) > 0:
                    raise RuntimeError(
                        (
                            'Error parsing file, '
                            'contains the following unknown units: {}'
                        ).format(error_units)
                    )

        # check for missing data and drop any rows where data are missing
        num_missing = data.isna().sum().sum()
        if num_missing > 0:
            data = data.fillna('')
        return data


    def parse_from_str(self, data_str, delimiter=None):
        data = StringIO(data_str)
        data = pd.read_csv(data, delimiter=delimiter)
        data = self.validate(data)
        return data
    
