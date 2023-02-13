import pandas as pd
from pkpdapp.models import Unit
from io import StringIO

from pkpdapp.pkpdapp.models.subject import Subject



 
class DataParser:
    alternate_col_names = {
        "ID": ["ID", "Subject_id", "Subject", "SUBJID"],
        "TIME": ["Time", "TIME", "TIMEPOINT", "t", "T", "time"],
        "TIME_UNIT": ["Time_unit", "Time_units", "TIMEUNIT"],
        "AMOUNT": ["Amt", "Amount", "AMT"],
        "AMOUNT_UNIT": ["Amt_unit", "Amt_units", "AMTUNIT"],
        "OBSERVATION": ["DV", "Observation", "Y", "YVAL"],
        "OBSERVATION_NAME": ["Observation_id", "YTYPE", "YNAME"],
        "OBSERVATION_UNIT": ["Observation_unit", "YDESC", "YUNIT"],
        "DOSE_GROUP": ["Dose_cat", "Dose_group", "DOSEGROUP"],
        "COMPOUND": ["Compound", "COMPOUND"],
        "ROUTE": ["Route", "ROUTE"],
        "INFUSION_TIME": ["TINF", "Tinf", "tinf", "Infusion_time", "INFUSIONTIME", "INFUSION_TIME"],
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
        "COMPOUND",
        "ROUTE",
        "INFUSION_TIME",
    ]

    altername_unit_names = {
        "h": ["hour"],
        "d": ["day"],
    }

    def validate(self, data: pd.DataFrame):
        colnames = data.columns.astype(str).tolist()

        # check that all required columns are present
        error_cols = []
        found_cols = {}
        for col_name in self.required_cols:
            col_alts = self.alternate_col_names[col_name]
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
            col_alts = self.alternate_col_names[col_name]
            for alternate_name in col_alts:
                if alternate_name in colnames:
                    found_cols[col_name] = alternate_name
                    break

        # set dataframe column names to standard names
        inv_found_cols = {v: k for k, v in found_cols.items()}
        data = data.rename(columns=inv_found_cols)


        # map alternate unit names to standard names
        inv_altername_unit_names = {}
        for k, v in self.altername_unit_names.items():
            for v2 in v:
                inv_altername_unit_names[v2] = k

        def map_unit_names(x):
            if x in inv_altername_unit_names:
                return inv_altername_unit_names[x]
            else:
                return x
        for unit_col in ["TIME_UNIT", "AMOUNT_UNIT", "OBSERVATION_UNIT"]:
            if unit_col in found_cols:
                data[unit_col] = data[unit_col].map(map_unit_names)
                
        # put in default observation name if not present
        if "OBSERVATION_NAME" not in found_cols:
            data["OBSERVATION_NAME"] = "observation"
            
        # put in default compound name if not present
        if "COMPOUND" not in found_cols:
            data["COMPOUND"] = "unknown compound"
            
        # put in default route name if not present
        if "ROUTE" not in found_cols:
            data["ROUTE"] = "IV"
            
        # put in default units if not present
        for unit_col in ["TIME_UNIT", "AMOUNT_UNIT", "OBSERVATION_UNIT"]:
            if unit_col not in found_cols:
                data[unit_col] = ""
                
        # put in default infusion time if not present
        min_delta_time = data["TIME", "SUBJECT_ID"].unique().sort_values(by=["SUBJECT_ID", "TIME"]).diff().min()
        if "INFUSION_TIME" not in found_cols:
            data["INFUSION_TIME"] = min_delta_time / 100.0

        # check that units are in database
        found_units = {}
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
                
        # check that time unit is constant
        if "TIME_UNIT" in found_cols:
            time_units = data["TIME_UNIT"].unique()
            if len(time_units) > 1:
                raise RuntimeError(
                    (
                        'Error parsing file, '
                        'contains multiple time units: {}'
                    ).format(time_units)
                )
        
        # check that units are same for each observation type
        if "OBSERVATION_UNIT" in found_cols:
            obs_units = data.groupby("OBSERVATION_ID")["OBSERVATION_UNIT"].unique()
            obs_units = obs_units.apply(lambda x: x[0])
            if len(obs_units.unique()) > 1:
                raise RuntimeError(
                    (
                        'Error parsing file, '
                        'contains multiple observation units: {}'
                    ).format(obs_units)
                )
            
        # check that dose group is constant for each subject id
        if "DOSE_GROUP" in found_cols:
            dose_groups = data.groupby("ID")["DOSE_GROUP"].unique()
            dose_groups = dose_groups.apply(lambda x: x[0])
            if len(dose_groups.unique()) > 1:
                raise RuntimeError(
                    (
                        'Error parsing file, '
                        'contains multiple dose groups: {}'
                    ).format(dose_groups)
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
    
    

    
