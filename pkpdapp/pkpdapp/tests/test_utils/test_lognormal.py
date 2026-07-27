#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from unittest import TestCase

import numpy as np

from pkpdapp.utils.lognormal import mean_std_to_median_logvar


class TestLognormal(TestCase):
    def test_round_trips_to_arithmetic_mean_and_std(self):
        # a log-normal built from the converted (median, log-variance) should have
        # the arithmetic mean and std that were supplied
        mean, std = 40.0, 8.0
        median, variance = mean_std_to_median_logvar(mean, std)

        rng = np.random.default_rng(0)
        samples = median * np.exp(rng.normal(0.0, np.sqrt(variance), size=200000))
        self.assertAlmostEqual(samples.mean(), mean, delta=0.2)
        self.assertAlmostEqual(samples.std(), std, delta=0.2)

    def test_matches_closed_form(self):
        mean, std = 5.0, 2.0
        median, variance = mean_std_to_median_logvar(mean, std)
        cv2 = (std / mean) ** 2
        self.assertAlmostEqual(variance, np.log1p(cv2))
        self.assertAlmostEqual(median, mean / np.sqrt(1.0 + cv2))

    def test_zero_std_collapses_to_point_mass_at_mean(self):
        median, variance = mean_std_to_median_logvar(12.0, 0.0)
        self.assertEqual(variance, 0.0)
        self.assertEqual(median, 12.0)
