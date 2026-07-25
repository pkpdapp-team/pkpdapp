#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
"""
Body-weight distributions by population region.

Weight is sampled from a log-normal per region and sex:
``WT_i = median * exp(N(0, variance))``.

The numbers are the single source of truth in ``weight_populations.json`` (next
to this file), which is also consumed by the frontend (synced into
``frontend-v2/src/shared/weightPopulations.ts``). Edit the JSON, not this module,
and re-run the frontend sync (``yarn sync:weight-populations``).

.. warning::
    The values in the JSON are **DUMMY PLACEHOLDER DATA**. Replace with real
    region-specific values (e.g. from NHANES / WHO) when available. The shape of
    the JSON and the two helper functions are the stable interface; only the
    numbers should change.
"""

import json
from pathlib import Path

import numpy as np

# sex is encoded as 0 = female (base category), 1 = male
FEMALE = 0
MALE = 1

_DATA_PATH = Path(__file__).with_name("weight_populations.json")
with _DATA_PATH.open() as _data_file:
    _DATA = json.load(_data_file)


def _to_int_sex_table(table):
    """Rekey a {"female"/"male": params} block by the integer sex codes."""
    return {FEMALE: table["female"], MALE: table["male"]}


# median in kg, variance of the log-normal random effect (dimensionless),
# keyed by region then integer sex. Built from the shared JSON source of truth.
WEIGHT_LOGNORMAL = {
    region: _to_int_sex_table(table) for region, table in _DATA["regions"].items()
}

# fallback used when a region is unknown / not set
_DEFAULT = _to_int_sex_table(_DATA["default"])


def _params(region, sex):
    region_table = WEIGHT_LOGNORMAL.get(region, _DEFAULT)
    return region_table.get(int(sex), region_table[FEMALE])


def reference_median_weight(region, sex) -> float:
    """Population median weight (kg) used to centre the weight covariate."""
    return float(_params(region, sex)["median"])


def sample_weight(region, sex, rng) -> float:
    """Draw one individual's body weight (kg) from the region/sex log-normal."""
    params = _params(region, sex)
    std = float(np.sqrt(params["variance"]))
    return float(params["median"] * np.exp(rng.normal(0.0, std)))
