import pandas as pd
from pkpdapp.models import Unit
from io import StringIO

from pkpdapp.models import Subject



 
class DataParser:
    alternate_col_names = {
        "SUBJECT_ID": ["ID", "id", "Subject_id", "Subject", "SUBJID"],
        "TIME": ["Time", "TIME", "TIMEPOINT", "t", "T", "time"],
        "TIME_UNIT": ["Time_unit", "Time_units", "TIMEUNIT"],
        "AMOUNT": ["Amt", "Amount", "AMT"],
        "AMOUNT_UNIT": ["Amt_unit", "Amt_units", "AMTUNIT", "UNIT"],
        "OBSERVATION": ["DV", "Observation", "Y", "YVAL"],
        "OBSERVATION_NAME": ["Observation_id", "YDESC", "YNAME"],
        "OBSERVATION_UNIT": ["Observation_unit", "YUNIT", "UNIT"],
        "DOSE_GROUP": ["Dose_cat", "Dose_group", "DOSEGROUP"],
        "COMPOUND": ["Compound", "COMPOUND"],
        "ROUTE": ["Route", "ROUTE"],
        "INFUSION_TIME": ["TINF", "Tinf", "tinf", "Infusion_time", "INFUSIONTIME", "INFUSION_TIME"],
    }

    required_cols = [
        "SUBJECT_ID",
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
        # we support the amount unit and observation unit being the same column
        inv_found_cols = {v: k for k, v in found_cols.items()}
        if (
            "AMOUNT_UNIT" in found_cols and 
            "OBSERVATION_UNIT" in found_cols and 
            found_cols["AMOUNT_UNIT"] == found_cols["OBSERVATION_UNIT"]
        ):
            amt_obs_unit_same_col = True
            amt_obs_unit_col = found_cols["AMOUNT_UNIT"]
            
            # manually set column map and then duplicate column
            inv_found_cols[amt_obs_unit_col] = "AMOUNT_UNIT"
            data = data.rename(columns=inv_found_cols)
            data["OBSERVATION_UNIT"] = data["AMOUNT_UNIT"]
        else:
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
        min_delta_time = data[["TIME", "SUBJECT_ID"]].drop_duplicates().sort_values(by=["SUBJECT_ID", "TIME"]).diff().min()["TIME"]
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
            obs_units = data.groupby("OBSERVATION_NAME")["OBSERVATION_UNIT"].unique()
            if amt_obs_unit_same_col:
                max_num_units = 2
            else:
                max_num_units = 1
            if obs_units.apply(lambda x: len(x) > max_num_units).any():
                raise RuntimeError(
                    (
                        'Error parsing file, '
                        'contains multiple observation units: {}'
                    ).format(obs_units)
                )
            
        # check that dose group is constant for each subject id
        if "DOSE_GROUP" in found_cols:
            dose_groups = data.groupby("SUBJECT_ID")["DOSE_GROUP"].unique()
            if dose_groups.apply(lambda x: len(x) > 1).any():
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
    
    def parse_from_stream(self, data_stream, delimiter=None):
        data = pd.read_csv(data_stream, delimiter=delimiter)
        data = self.validate(data)
        return data

    

    
    

    
