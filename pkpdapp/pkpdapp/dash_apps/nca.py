#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import numpy as np
import scipy.stats as stats
import pandas as pd



class NCA():
    def __init__(self,
                 time, conc, DM,
                 doseSchedule='Single', administrationRoute='IVBolus'
                 ):
        """
        Initialise NCA class for calculating and storing NCA parameters
        :param time: {np.ndarray} --- array of observation times
        :param conc: {np.ndarray} --- array of observed concentration values
        :param DM: {float} --- administered dose amount
        :param doseSchedule: {string} Single or Multiple dose data
        :param administrationRoute: {string} IVBolus, IVInfusion, ExtraVascular
        """
        # Check if intial concentration has been measured

        if time[0] == 0:
            self.is_c0extrapolated = False  # initial concentration measured
            self.time = time
            self.conc = conc
            self.DM = DM  # dose amount
            self.C_0 = None  # not extrapolated
            self.administrationRoute = administrationRoute
        else:
            self.is_c0extrapolated = True  # initial concentration NOT measured
            c0 = self.extrapolate_c0(conc, time)  # extrapolate initial conc
            self.C_0 = c0
            self.time = np.insert(time, 0, 0, axis=0)
            self.conc = np.insert(conc, 0, c0, axis=0)
            self.DM = DM  # dose amount
            self.administrationRoute = administrationRoute

    def calculate_nca(self):
        """
        Calculates and stores all single dose NCA parameters
        :return: None
        """
        self.AUC_0_last = self._AUC_0_last()
        self.AUMC_0_last = self._AUMC_0_last()
        self.Lambda_z, self.R2, self.Num_points = self._Lambda_z()

        self.AUC_infinity = self._AUC_infinity()
        self.AUC_infinity_dose = self._AUC_infinity_dose()
        # self.AUCx_y
        self.AUC_extrap_percent = self._AUC_extrap_percent()
        self.CL = self._CL()
        self.C_max, self.T_max = self._find_Cmax()
        self.C_max_Dose = self._C_max_Dose()
        # C_max_x_y

        self.AUMC = self._AUMC()
        self.AUMC_extrap_percent = self._AUMC_extrap_percent()
        self.MRT = self._MRT()
        self.Tlast = self._Tlast()  # ?? above LOQ?
        self.T_half = np.log(2) / self.Lambda_z
        # T_max_x_y
        if self.administrationRoute == 'IVBolus':
            self.V_ss = self._V_ss()
        else:
            self.V_ss = None

        self.V_z = self._V_z()

    @staticmethod
    def extrapolate_c0(y, x):
        """
        Calculate initial concentration when not given, computed using a (log)
        regression of the first two data points in a profile.
        Arguments:
        y {np.ndarray} -- y coordinates of points on curve
        x {np.ndarray} -- x coordinates of points on curve

        Returns:
        c0 {double} -- extrapoloated c0
        """
        slope, intercept, r_value, _, _ = \
            stats.linregress(x[:2], np.log(y[:2]), )
        c0 = np.exp(intercept)
        return c0

    @staticmethod
    def log_trapz(y, x):
        """Calculate area under curve using log trapezoidal method (log mean).
        Arguments:
        :param y {np.ndarray} -- y coordinates of points on curve
        :param x {np.ndarray} -- x coordinates of points on curve
        Returns:
        :return area {double} -- area under curve
        """
        y1 = y[:-1]  # exclude last term
        x1 = x[:-1]  # exclude last term
        y2 = y[1:]  # exclude first term
        x2 = x[1:]  # exclude first term

        area = np.sum((y1 - y2) / (np.log(y1) - np.log(y2)) * (x2 - x1))
        return area

    @staticmethod
    def linlog_trapz(y, x, linlog=True):
        """
        Calculate area under curve using combination of linear and log
        trapezoidal method (linear when increasing, log when decreasing) or
        optionally just linear trapezoidal method
        :param y {np.ndarray} -- y coordinates of points on curve
        :param x {np.ndarray} -- x coordinates of points on curve
        :param linlog {bool} -- use linear-log trapezoidal method
        Returns:
        :return area {float} -- area under curve
        """
        if linlog:  # use lin-log trapezoid
            ymax_indx = np.argmax(y)  # index of maximum concentration
            # linear trapezium for increasing part
            area1 = np.trapz(y[:ymax_indx + 1], x[:ymax_indx + 1])
            # log trapezium for decreasing part
            area2 = NCA.log_trapz(y[ymax_indx:], x[ymax_indx:])
            area = area1 + area2
        else:  # use linear trapezoid only
            area = np.trapz(x, y)
        return area

    def _AUC_0_last(self, linlog=True):
        """
        Calculates area under the concentration–time curve (AUC) from time 0 to
        the last time point Tlast using linear-log trapezoidal method
        Arguments:
        :param y {np.ndarray} -- y coordinates of points on curve
        :param x {np.ndarray} -- x coordinates of points on curve
        Returns:
        :return auc {float} -- AUMC
        """
        y = self.conc
        x = self.time
        auc = self.linlog_trapz(y, x, linlog=linlog)
        return auc

    def _AUMC_0_last(self, linlog=True):
        """
        Calculate area under the first moment of the concentration–time curve
        (AUMC) from time 0 to the last time point Tlast using linear log
        trapezoidal method
        Arguments:
        :param y {np.ndarray} -- y coordinates of points on curve
        :param x {np.ndarray} -- x coordinates of points on curve
        Returns:
        :return aumc {float} -- AUMC
        """
        y = self.conc * self.time  # conc * time for first moment curve
        x = self.time
        aumc = self.linlog_trapz(y, x, linlog=linlog)
        return aumc

    def _Lambda_z(self):
        """
        Calculates terminal rate constant by performing set of linear
        regressions on log(conc)-time data using the last n (=3,4,...) points
        from the terminal (decreasing T >= Tmax) section of curve and returning
        rate constant with maximum adj_r
        :return lambda_z {float} -- terminal rate constant
        :return R2 {float} -- coefficient of determination for best
                            linear regression
        :return m {int} -- number of data points used in best linear regression
        """
        y = self.conc
        x = self.time
        r = 0
        lambda_z = 0
        cmax_indx = np.argmax(y)  # index of max concentration
        n_upper = len(y) - cmax_indx  # max number of points to consider
        for n in range(3, n_upper + 1):  # perform regressions
            slope, intercept, r_value, _, _ = \
                stats.linregress(x[-n:], np.log(y[-n:]))
            adj_r = 1 - ((1 - r_value ** 2) * (n - 1)) / (n - 2)
            # Update lambda, r and m if adj_r has increased
            if adj_r > r:
                r = adj_r
                lambda_z = np.abs(slope)
                m = n
        return lambda_z, r ** 2, m

    def _AUC_infinity(self):
        """
        Calculate total area under the concentration–time curve extrapolating
        to Inf using the terminal rate constant Lambda_z.
        :return: auc_inf {float} AUC-Inf
        """
        auc_inf = self.AUC_0_last + self.conc[-1] / self.Lambda_z
        return auc_inf

    def _AUC_infinity_dose(self):
        """
        Calculate AUC-Infinity divided by administered dose amount
        :return: {float} -- AUC-Inf Dose = AUC-Inf/DM
        """
        return self.AUC_infinity / self.DM

    def _AUC_extrap_percent(self):
        """
        Calculate fraction of total AUC_infinity obtained from extrapolation
        :return {float} -- extrapolated percentage
        """
        return 100 * (self.AUC_infinity - self.AUC_0_last) / self.AUC_infinity

    def _CL(self):
        """
        Calculate total drug clearance (DM/AUC-Inf)
        :return {float} -- total drug clearance CL = DM/AUC-Inf
        """
        return self.DM / self.AUC_infinity

    def _find_Cmax(self):
        """
        Find maximum observed concentration and corresponding time
        :return {float} -- max concentration
        :return {float} -- time of max conc
        """
        if self.is_c0extrapolated:  # ignore extrapolated c0
            indx = np.argmax(self.conc[1:]) + 1  # index of maximum
        else:
            indx = np.argmax(self.conc)
        return self.conc[indx], self.time[indx]

    def _C_max_Dose(self):
        """
        Calculate CmaxDose
        :return: {float} -- CmaxDose =  Cmax/DM
        """
        return self.C_max / self.DM

    def _AUMC(self):
        """
        Calculate area under the first moment of the concentration–time curve
        extrapolated to Inf
        :return: aumc {float} -- AUMC
        """
        aumc = self.AUMC_0_last + \
            self.conc[-1] / (self.Lambda_z**2) + self.time[-1] * \
            self.conc[-1] / self.Lambda_z
        return aumc

    def _AUMC_extrap_percent(self):
        """
        Calculate fraction of total AUMC obtained from extrapolation
        :return {float} -- extrapolated percentage
        """
        return 100 * (self.AUMC - self.AUMC_0_last) / self.AUMC

    def _MRT(self):
        """
        Calculate mean residence time (MRT) of drug
        :return: {float} -- MRT = AUMC/AUC-Inf
        """
        return self.AUMC / self.AUC_infinity

    def _Tlast(self):
        """
        :return: {float} -- time of last observed concentration value
        """
        return self.time[-1]

    def _T_half(self):
        """
        Calculate terminal half life of drug (time to decay to half amount
        under terminal rate constant)
        :return: {float} -- terminal half life
        """
        return np.log(2) / self.Tlast

    def _V_ss(self):
        """
        Calculate apparent volume of distribution at equilibrium. (IV Bolus
        doses only).
        :return: {float} -- apparent volume of distribution
        """
        return (self.DM * self.AUMC) / (self.AUC_infinity * self.Lambda_z)

    def _V_z(self):
        """
        Calculate volume of distribution during the terminal phase.
        :return: volume of distribution
        """
        return self.DM / (self.AUC_infinity * self.Lambda_z)

