#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
"""
Conversions between the user-facing (arithmetic mean, standard deviation) of a
log-normal quantity and its internal representation (median, log-space variance).

Users enter the arithmetic mean ``M`` and standard deviation ``S`` of the actual
(non-log) quantity, which are more intuitive than the log-space parameters. A
log-normal with log-space parameters ``mu = ln(median)`` and ``variance`` has::

    M = median * exp(variance / 2)
    S = M * sqrt(exp(variance) - 1)

so, with ``cv2 = (S / M) ** 2``::

    variance = ln(1 + cv2)
    median   = M / sqrt(1 + cv2)

``S = 0`` collapses to a point mass at ``median = M`` (variance 0).
"""

import numpy as np


def mean_std_to_median_logvar(mean: float, std: float) -> tuple[float, float]:
    """Convert arithmetic mean/std of a log-normal to (median, log-space variance).

    ``mean`` must be positive. See the module docstring for the formulae.
    """
    cv2 = (std / mean) ** 2
    variance = float(np.log1p(cv2))
    median = float(mean / np.sqrt(1.0 + cv2))
    return median, variance


def median_logvar_to_mean_std(median: float, variance: float) -> tuple[float, float]:
    """Inverse of mean_std_to_median_logvar."""
    mean = float(median * np.exp(variance / 2.0))
    std = float(mean * np.sqrt(np.expm1(variance)))
    return mean, std
