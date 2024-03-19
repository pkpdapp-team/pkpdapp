#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import pandas as pd
from pkpdapp.models import Unit
from io import StringIO


class DataParser:
    alternate_col_names = {
        "ADMINISTRATION_ID": [
            "Administration ID", "CMT", "Cmt", "cmt", "ADM", "Adm", "adm"
        ],
        "SUBJECT_ID": [
            "ID", "id", "Subject_id", "Subject", "SUBJID",
            "SUBJECT_ID"
        ],
        "TIME": [
            "Time", "TIME", "TIMEPOINT", "t", "T", "time",
        ],
        "TIME_UNIT": [
            "Time_unit", "Time_units", "TIMEUNIT", "TIME_UNIT", "Units_Time"
        ],
        "AMOUNT": [
            "Amt", "Amount", "AMT", "AMOUNT"
        ],
        "AMOUNT_UNIT": [
            "Amt_unit", "Amt_units", "AMTUNIT", "UNIT", "AMOUNT_UNIT", "Units_AMT"
        ],
        "AMOUNT_VARIABLE": [
            "Amount Variable", "AMOUNT_VARIABLE"
        ],
        "OBSERVATION": [
            "DV", "Observation", "Y", "YVAL", "OBSERVATION", "Conc",
            "OBSERVATION_VALUE", "OBSERVATIONVALUE"
        ],
        "OBSERVATION_NAME": [
            "Observation_id", "YDESC", "YNAME", "YTYPE", "OBSERVATION_ID",
            "OBSERVATION_NAME", "OBSERVATIONID", "OBSERVATIONNAME"
        ],
        "OBSERVATION_UNIT": [
            "DV_units", "Observation_unit", "YUNIT", "UNIT", "Units_Conc",
            "OBSERVATION_UNIT",
            "OBSERVATIONUNIT"
        ],
        "OBSERVATION_VARIABLE": [
            "Observation Variable", "OBSERVATION_VARIABLE"
        ],
        "COMPOUND": [
            "Compound", "COMPOUND"
        ],
        "ROUTE": [
            "Route", "ROUTE"
        ],
        "INFUSION_TIME": [
            "TINF", "Tinf", "tinf", "Infusion_time", "INFUSIONTIME",
            "INFUSION_TIME"
        ],
        "GROUP_ID": [
            "Group ID", "Group", "GROUP", "cohort", "Cohort", "COHORT"
        ]
    }

    required_cols = [
        "SUBJECT_ID",
        "TIME",
        "AMOUNT",
        "OBSERVATION",
    ]

    optional_cols = [
        "TIME_UNIT",
        "AMOUNT_UNIT",
        "AMOUNT_VARIABLE",
        "OBSERVATION_UNIT",
        "OBSERVATION_NAME",
        "OBSERVATION_VARIABLE",
        "COMPOUND",
        "ROUTE",
        "INFUSION_TIME",
        "GROUP_ID"
    ]

    alternate_unit_names = {
        "h": ["hour"],
        "day": ["d"],
    }

    def is_covariate_column(self, col_name):
        return col_name not in self.required_cols + self.optional_cols

    def validate(self, data: pd.DataFrame):
        colnames = data.columns.astype(str).tolist()

        # check that all required columns are present
        error_cols = []
        found_cols = {}
        covariate_cols = {}
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

        # all remaining columns are covariates
        for col_name in colnames:
            if col_name not in found_cols.values():
                covariate_cols[col_name] = col_name

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
            amt_obs_unit_same_col = False
            data = data.rename(columns=inv_found_cols)

        # map alternate unit names to standard names
        inv_altername_unit_names = {}
        for k, v in self.alternate_unit_names.items():
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

        # put in blank observation variable if not present
        if "OBSERVATION_VARIABLE" not in found_cols:
            data["OBSERVATION_VARIABLE"] = ""

        # put in blank amount variable if not present
        if "AMOUNT_VARIABLE" not in found_cols:
            data["AMOUNT_VARIABLE"] = ""

        # put in default compound name if not present
        if "COMPOUND" not in found_cols:
            data["COMPOUND"] = "unknown compound"

        # put in default route name if not present
        if "ROUTE" not in found_cols:
            data["ROUTE"] = "IV"

        # put in default subject group if not present
        if "GROUP_ID" not in found_cols:
            data["GROUP_ID"] = 1

        # put in default units if not present, convert any percentage units
        # to dimensionless
        for unit_col in ["TIME_UNIT", "AMOUNT_UNIT", "OBSERVATION_UNIT"]:
            if unit_col not in found_cols:
                data[unit_col] = ""
            else:
                def convert_percent_to_dim(x):
                    xl = x.lower()
                    if (
                        "percent" in xl or
                        "fraction" in xl or
                        "ratio" in xl or
                        "%" in xl
                    ):
                        return ""
                    else:
                        return x
                data[unit_col] = data[unit_col].map(convert_percent_to_dim)

        # put in default infusion time if not present
        delta_time = data.sort_values(by=["TIME"]).groupby(
            ["SUBJECT_ID"]
        )["TIME"].diff().dropna()
        min_delta_time = delta_time[delta_time > 0].min()
        if "INFUSION_TIME" not in found_cols:
            data["INFUSION_TIME"] = min_delta_time / 100.0

        # check that infusion time is not zero or negative
        if (
            data["INFUSION_TIME"].apply(pd.to_numeric, errors='coerce') <= 0
        ).any():
            raise RuntimeError(
                (
                    'Error parsing file, '
                    'contains zero infusion time'
                )
            )

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
            obs_units = data.groupby("OBSERVATION_NAME")[
                "OBSERVATION_UNIT"].unique()
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
