#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import numpy as np
import scipy.stats as stats
from scipy.optimize import curve_fit


def fsigmoid(concentration, top, bottom, EC50):
    """
    this function simulates Emax-EC50 curve for a
    given concentration range
    """
    return (
        bottom + concentration *
        (top - bottom) / (EC50 + concentration)
    )


class Auce():
    def __init__(self, name, subject_ids, concentrations, subject_times, subject_data):
        """
        Initialise AUCE class for calculating and storing
        AUCE data and fits
        :param name: {str} --- group name
        :param subject_ids: {np.ndarray} --- array of subject ids
        :param concentrations: {np.ndarray} --- array of concentrations, one
        for each subject
        :param subject_times: {list of np.ndarray} --- list of arrays of
        observation times, one array for each subject
        :param subject_datas: {list of np.ndarray} --- list of arrays of
        biomarker values, one array for each subject
        """

        self.fit_type = 'Sigmoid'
        self.name = name
        self.subject_ids = subject_ids
        self.concentrations = concentrations
        self.subject_times = subject_times
        self.subject_data = subject_data
        self.auce = []
        for values, times in zip(subject_data, subject_times):
            self.auce.append(self.calculate_auce(values, times))

        self.fit = self.auce_fit(
            self.concentrations, self.auce
        )

    @staticmethod
    def calculate_auce(values, times):
        return np.trapz(values, times)

    def auce_fit(self, concentrations, auce):
        if self.fit_type != 'Sigmoid':
            return None
        if len(concentrations) < 4:
            return None

        p0 = [max(auce), min(auce), 1000]
        fitted_params, covariates = curve_fit(
            fsigmoid, concentrations, auce, p0=p0
        )
        fit_top, fit_bottom, fit_EC50 = fitted_params

        sigma_top, sigma_bottom, sigma_EC50 = np.sqrt(
            np.diag(covariates)
        )

        if (
            fit_EC50 <= 0 or
            not sigma_bottom or
            not sigma_EC50 or
            not sigma_top or
            fit_EC50 - abs(sigma_EC50) <= 0
        ):
            return None

        if min(concentrations):
            x = np.geomspace(
                min(concentrations), max(concentrations), 500
            )
        else:
            x = np.geomspace(0.1, max(concentrations), 500)

        y = fsigmoid(x, *fitted_params)

        y_upper = fsigmoid(
            x, fit_top + abs(sigma_top),
            fit_bottom + abs(sigma_bottom),
            fit_EC50 - abs(sigma_EC50)
        )
        y_lower = fsigmoid(
            x, fit_top - abs(sigma_top),
            fit_bottom - abs(sigma_bottom),
            fit_EC50 + abs(sigma_EC50)
        )

        return {
            'x': x,
            'y': y,
            'y_upper': y_upper,
            'y_lower': y_lower,
            'fit_EC50': fit_EC50,
            'sigma_EC50': sigma_EC50,
            'fit_EC50_y': fsigmoid(fit_EC50, *fitted_params),
            'fitted_params': fitted_params,
            'covariates': covariates,
            'fit_top': fit_top,
            'sigma_top': sigma_top,
            'fit_bottom': fit_top,
            'sigma_bottom': sigma_bottom,
        }
