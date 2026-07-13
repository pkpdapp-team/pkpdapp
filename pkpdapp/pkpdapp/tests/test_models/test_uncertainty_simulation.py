#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import numpy as np
from django.test import SimpleTestCase

from pkpdapp.models import Distribution
from pkpdapp.models.uncertainty_simulation_mixin import UncertaintySimulationMixin


class _Mixin(UncertaintySimulationMixin):
    """Bare host for the covariance/sampling helpers (no DB needed)."""


class TestCovarianceHelpers(SimpleTestCase):
    def setUp(self):
        self.mixin = _Mixin()
        self.distributions = {
            "A": Distribution(pdf=Distribution.PDF.NORMAL, variance=0.1),
            "B": Distribution(pdf=Distribution.PDF.NORMAL, variance=0.2),
        }

    def test_build_covariance_matrix(self):
        covariance = self.mixin._build_covariance_matrix(
            ["A", "B"], self.distributions, {("A", "B"): 0.5}
        )
        expected_off = 0.5 * np.sqrt(0.1) * np.sqrt(0.2)
        self.assertAlmostEqual(covariance[0, 0], 0.1)
        self.assertAlmostEqual(covariance[1, 1], 0.2)
        self.assertAlmostEqual(covariance[0, 1], expected_off)
        self.assertAlmostEqual(covariance[1, 0], expected_off)

    def test_nearest_psd_fixes_invalid_matrix(self):
        # a 3x3 correlation matrix with these pairwise values is not PSD
        invalid = np.array(
            [
                [1.0, 0.9, 0.9],
                [0.9, 1.0, -0.9],
                [0.9, -0.9, 1.0],
            ]
        )
        self.assertLess(np.linalg.eigvalsh(invalid).min(), 0)
        psd = self.mixin._nearest_psd(invalid)
        # all eigenvalues are now non-negative (allowing tiny numerical error)
        self.assertGreaterEqual(np.linalg.eigvalsh(psd).min(), -1e-9)
        # already-PSD matrices are returned unchanged
        valid = np.diag([0.1, 0.2])
        np.testing.assert_allclose(self.mixin._nearest_psd(valid), valid, atol=1e-12)

    def test_draw_correlated_etas_reproduces_target_correlation(self):
        covariance = self.mixin._build_covariance_matrix(
            ["A", "B"], self.distributions, {("A", "B"): 0.6}
        )
        rng = np.random.default_rng(0)
        draws = self.mixin._draw_correlated_etas(
            ["A", "B"], covariance, 50000, rng
        )
        a = np.array([d["A"] for d in draws])
        b = np.array([d["B"] for d in draws])
        empirical = np.corrcoef(a, b)[0, 1]
        self.assertAlmostEqual(empirical, 0.6, delta=0.02)

    def test_sample_variables_applies_etas(self):
        distributions = {
            "A": Distribution(pdf=Distribution.PDF.LOGNORMAL, variance=0.1),
        }
        sampled = self.mixin._sample_variables(
            variables={"A": 2.0},
            variable_distributions=distributions,
            rng=np.random.default_rng(0),
            etas={"A": 0.0},
        )
        # eta == 0 collapses the lognormal to its typical value
        self.assertAlmostEqual(sampled["A"], 2.0)
