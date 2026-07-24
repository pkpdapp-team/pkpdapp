#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
"""
Body-weight distributions by population region.

Weight is sampled from a log-normal per region and sex:
``WT_i = median * exp(N(0, variance))``.

.. warning::
    The values below are **DUMMY PLACEHOLDER DATA**. Replace with real
    region-specific values (e.g. from NHANES / WHO) when available. The shape of
    ``WEIGHT_LOGNORMAL`` and the two helper functions are the stable interface;
    only the numbers should change.
"""

import numpy as np

# sex is encoded as 0 = female (base category), 1 = male
FEMALE = 0
MALE = 1

# DUMMY DATA — replace with real NHANES / WHO values.
# median in kg, variance of the log-normal random effect (dimensionless).
WEIGHT_LOGNORMAL = {
    "US": {
        FEMALE: {"median": 77.0, "variance": 0.05},
        MALE: {"median": 89.0, "variance": 0.05},
    },
    "EU": {
        FEMALE: {"median": 70.0, "variance": 0.05},
        MALE: {"median": 84.0, "variance": 0.05},
    },
    "ASIA": {
        FEMALE: {"median": 59.0, "variance": 0.05},
        MALE: {"median": 69.0, "variance": 0.05},
    },
}

# fallback used when a region is unknown / not set
_DEFAULT = {
    FEMALE: {"median": 70.0, "variance": 0.05},
    MALE: {"median": 84.0, "variance": 0.05},
}


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
