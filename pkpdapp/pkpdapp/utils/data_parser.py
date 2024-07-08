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
            "administration id", "cmt", "adm", "adm_id", "administration_id"
        ],
        "SUBJECT_ID": [
            "id", "subject_id", "subject", "subjid", "animal number"
        ],
        "TIME": [
            "time", "timepoint", "t", "hour_actual", "ivar",
        ],
        "TIME_UNIT": [
            "time unit", "time_unit", "time_units", "timeunit", "units_time",
            "unit_time", "unit time",
        ],
        "AMOUNT": [
            "amt", "amount"
        ],
        "AMOUNT_UNIT": [
            "amount unit", "amt_unit", "amt_units", "amtunit", "unit",
            "amount_unit", "units_amt", "unit_amount", "unit amount",
            "dose unit", "dose_unit", "unit dose", "unit_dose"
        ],
        "AMOUNT_VARIABLE": [
            "amount variable", "amount_variable", "amount_var",
            "amt_var", "amtvar", "amt_variable"
        ],
        "OBSERVATION": [
            "dv", "observation", "y", "yval", "conc",
            "observation_value", "observationvalue"
        ],
        "OBSERVATION_NAME": [
            "observation id", "observation_id", "ydesc", "yname", "ytype",
            "observation_name", "observationid", "observationname"
        ],
        "OBSERVATION_UNIT": [
            "observation unit", "dv_units", "observation_unit", "yunit", "unit",
            "units_conc", "observationunit", "unit_observation", "unit observation",
            "observation_unit", "concentration unit", "concentration_unit",
            "unit concentration", "unit_concentration",
        ],
        "OBSERVATION_VARIABLE": [
            "observation variable", "observation_variable", "observation_var"
        ],
        "COMPOUND": [
            "compound"
        ],
        "ROUTE": [
            "route"
        ],
        "INFUSION_TIME": [
            "infusion duration", "tinf", "infusion_time", "infusiontime"
        ],
        "GROUP_ID": [
            "group id", "group_id", "group", "cohort"
        ],
        "ADDITIONAL_DOSES": [
            "additional doses", "addl", "additional_doses"
        ],
        "INTERDOSE_INTERVAL": [
            "interdose interval", "ii", "infusion_interval"
        ],
        "EVENT_ID": [
            "event id", "event_id", "eventid", "evid"
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
        "ADMINISTRATION_ID",
        "AMOUNT_UNIT",
        "AMOUNT_VARIABLE",
        "OBSERVATION_UNIT",
        "OBSERVATION_NAME",
        "OBSERVATION_VARIABLE",
        "COMPOUND",
        "ROUTE",
        "INFUSION_TIME",
        "GROUP_ID",
        "ADDITIONAL_DOSES",
        "INTERDOSE_INTERVAL",
        "EVENT_ID"
    ]

    alternate_unit_names = {
        "h": ["hour"],
        "day": ["d"],
    }

    def is_covariate_column(self, col_name):
        return col_name not in self.required_cols + self.optional_cols

    def validate(self, data: pd.DataFrame):
        data.columns = data.columns.str.lower()
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
        # put in default event ID if not present
        if "EVENT_ID" not in found_cols:
            data["EVENT_ID"] = None

        # put in default additional dosing columns if not present
        if "ADDITIONAL_DOSES" not in found_cols:
            data["ADDITIONAL_DOSES"] = ""
        if "INTERDOSE_INTERVAL" not in found_cols:
            data["INTERDOSE_INTERVAL"] = ""

        # put in default units if not present, convert any percentage units
        # to dimensionless
        for unit_col in ["TIME_UNIT", "AMOUNT_UNIT", "OBSERVATION_UNIT"]:
            if unit_col not in found_cols:
                data[unit_col] = ""
            else:
                def convert_percent_to_dim(x):
                    xl = str(x).lower()
                    if (
                        "nan" in xl or
                        "percent" in xl or
                        "fraction" in xl or
                        "ratio" in xl or
                        "%" in xl or
                        "dimensionless" in xl
                    ):
                        return ""
                    else:
                        return x
                data[unit_col] = data[unit_col].map(convert_percent_to_dim)

        # check that time is set for all rows
        if pd.to_numeric(data["TIME"], errors='coerce').isna().any():
            raise RuntimeError(
                (
                    'Error parsing file, '
                    'contains missing time values'
                )
            )

        # convert subject id to integer
        try:
            data["SUBJECT_ID"] = pd.to_numeric(data["SUBJECT_ID"], errors='raise')
        except (ValueError, TypeError):
            subject_ids = data["SUBJECT_ID"].unique().tolist()
            subject_ids.sort()
            subject_id_map = {k: i for i, k in enumerate(subject_ids)}
            data["SUBJECT_ID"] = data["SUBJECT_ID"].map(subject_id_map)

        # put in default infusion time if not present
        if "INFUSION_TIME" not in found_cols:
            data["INFUSION_TIME"] = 0.0833

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
