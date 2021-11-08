#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import numpy as np
import scipy.stats as stats


class NCA():
    def __init__(self,
                 times, concs, DM,
                 doseSchedule='Single', administrationRoute='IVBolus'
                 ):
        """
        Initialise NCA class for calculating and storing NCA parameters
        :param times: {np.ndarray} --- array of observation times
        :param concs: {np.ndarray} --- array of observed concentration values
        :param DM: {float} --- administered dose amount
        :param doseSchedule: {string} Single or Multiple dose data
        :param administrationRoute: {string} IVBolus, IVInfusion, ExtraVascular
        """
        # Check if intial concentration has been measured

        if times[0] == 0:
            self.is_c0extrapolated = False  # initial concentration measured
            self.times = times
            self.concentrations = concs
            self.dose_amount = DM  # dose amount
            self.c_0 = None  # not extrapolated
            self.administration_route = administrationRoute
        else:
            self.is_c0extrapolated = True  # initial concentration NOT measured
            c0 = self.extrapolate_c0(concs, times)  # extrapolate initial conc
            self.c_0 = c0
            self.times = np.insert(times, 0, 0, axis=0)
            self.concentrations = np.insert(concs, 0, c0, axis=0)
            self.dose_amount = DM  # dose amount
            self.administration_route = administrationRoute

    def calculate_nca(self):
        """
        Calculates and stores all single dose NCA parameters
        :return: None
        """
        self.auc_0_last = self._auc_0_last()
        self.aumc_0_last = self._aumc_0_last()
        self.lambda_z, self.r2, self.num_points = self._Lambda_z()

        self.auc_infinity = self._auc_infinity()
        self.auc_infinity_dose = self._auc_infinity_dose()
        # self.aucx_y
        self.auc_extrap_percent = self._auc_extrap_percent()
        self.cl = self._CL()
        self.c_max, self.t_max = self._find_Cmax()
        self.c_max_dose = self._C_max_Dose()
        # C_max_x_y

        self.aumc = self._aumc()
        self.aumc_extrap_percent = self._aumc_extrap_percent()
        self.mrt = self._MRT()
        self.tlast = self._Tlast()  # ?? above LOQ?
        self.t_half = np.log(2) / self.lambda_z
        # T_max_x_y
        if self.administration_route == 'IVBolus':
            self.v_ss = self._V_ss()
        else:
            self.v_ss = None

        self.v_z = self._V_z()

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
        _, intercept, _, _, _ = \
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
        y1 = y[:-1]
        x1 = x[:-1]
        y2 = y[1:]
        x2 = x[1:]

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

    def _auc_0_last(self, linlog=True):
        """
        Calculates area under the concentration–time curve (auc) from time 0 to
        the last time point Tlast using linear-log trapezoidal method
        Arguments:
        :param y {np.ndarray} -- y coordinates of points on curve
        :param x {np.ndarray} -- x coordinates of points on curve
        Returns:
        :return auc {float} -- aumc
        """
        y = self.concentrations
        x = self.times
        auc = self.linlog_trapz(y, x, linlog=linlog)
        return auc

    def _aumc_0_last(self, linlog=True):
        """
        Calculate area under the first moment of the concentration–time curve
        (aumc) from time 0 to the last time point Tlast using linear log
        trapezoidal method
        Arguments:
        :param y {np.ndarray} -- y coordinates of points on curve
        :param x {np.ndarray} -- x coordinates of points on curve
        Returns:
        :return aumc {float} -- aumc
        """
        # conc * time for first moment curve
        y = self.concentrations * self.times
        x = self.times
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
        y = self.concentrations
        x = self.times
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

    def _auc_infinity(self):
        """
        Calculate total area under the concentration–time curve extrapolating
        to Inf using the terminal rate constant Lambda_z.
        :return: auc_inf {float} auc-Inf
        """
        auc_inf = self.auc_0_last + self.concentrations[-1] / self.lambda_z
        return auc_inf

    def _auc_infinity_dose(self):
        """
        Calculate auc-Infinity divided by administered dose amount
        :return: {float} -- auc-Inf Dose = auc-Inf/DM
        """
        return self.auc_infinity / self.dose_amount

    def _auc_extrap_percent(self):
        """
        Calculate fraction of total auc_infinity obtained from extrapolation
        :return {float} -- extrapolated percentage
        """
        return 100 * (self.auc_infinity - self.auc_0_last) / self.auc_infinity

    def _CL(self):
        """
        Calculate total drug clearance (DM/auc-Inf)
        :return {float} -- total drug clearance CL = DM/auc-Inf
        """
        return self.dose_amount / self.auc_infinity

    def _find_Cmax(self):
        """
        Find maximum observed concentration and corresponding time
        :return {float} -- max concentration
        :return {float} -- time of max conc
        """
        if self.is_c0extrapolated:  # ignore extrapolated c0
            indx = np.argmax(self.concentrations[1:]) + 1  # index of maximum
        else:
            indx = np.argmax(self.concentrations)
        return self.concentrations[indx], self.times[indx]

    def _C_max_Dose(self):
        """
        Calculate CmaxDose
        :return: {float} -- CmaxDose =  Cmax/DM
        """
        return self.c_max / self.dose_amount

    def _aumc(self):
        """
        Calculate area under the first moment of the concentration–time curve
        extrapolated to Inf
        :return: aumc {float} -- aumc
        """
        aumc = self.aumc_0_last + \
            self.concentrations[-1] / (self.lambda_z**2) + self.times[-1] * \
            self.concentrations[-1] / self.lambda_z
        return aumc

    def _aumc_extrap_percent(self):
        """
        Calculate fraction of total aumc obtained from extrapolation
        :return {float} -- extrapolated percentage
        """
        return 100 * (self.aumc - self.aumc_0_last) / self.aumc

    def _MRT(self):
        """
        Calculate mean residence time (MRT) of drug
        :return: {float} -- MRT = aumc/auc-Inf
        """
        return self.aumc / self.auc_infinity

    def _Tlast(self):
        """
        :return: {float} -- time of last observed concentration value
        """
        return self.times[-1]

    def _T_half(self):
        """
        Calculate terminal half life of drug (time to decay to half amount
        under terminal rate constant)
        :return: {float} -- terminal half life
        """
        return np.log(2) / self.tlast

    def _V_ss(self):
        """
        Calculate apparent volume of distribution at equilibrium. (IV Bolus
        doses only).
        :return: {float} -- apparent volume of distribution
        """
        return (
            (self.dose_amount * self.aumc) /
            (self.auc_infinity * self.lambda_z)
        )

    def _V_z(self):
        """
        Calculate volume of distribution during the terminal phase.
        :return: volume of distribution
        """
        return self.dose_amount / (self.auc_infinity * self.lambda_z)

class NCA_multi():
    def __init__(self,
                 times, concs, protocol,
                 doseSchedule='Multiple', administrationRoute='IVBolus'
                 ):
        """
        Initialise NCA class for calculating and storing NCA parameters
        :param times: {np.ndarray} --- array of observation times
        :param concs: {np.ndarray} --- array of observed concentration values
        :param protocol: {np.darray} --- array of administrated doses
        :param doseSchedule: {string} Single or Multiple dose data
        :param administrationRoute: {string} IVBolus, IVInfusion, ExtraVascular
        """
        # Check if intial concentration has been measured

        if times[0] == 0:
            self.is_c0extrapolated = False  # initial concentration measured
            self.times = times
            self.concentrations = concs
            self.protocol = protocol  # dose amount
            self.dose_start = self.protocol[1]
            self.dose_number = self.protocol[4]
            self.dose_period = self.protocol[3]
            self.dose_amount = self.protocol[2] 
            self.c_0 = None  # not extrapolated
            self.administration_route = administrationRoute
        else:
            self.is_c0extrapolated = True  # initial concentration NOT measured
            c0 = self.extrapolate_c0(concs, times)  # extrapolate initial conc
            self.c_0 = c0
            self.times = np.insert(times, 0, 0, axis=0)
            self.concentrations = np.insert(concs, 0, c0, axis=0)
            self.protocol = protocol  # dose amount
            self.dose_start = self.protocol[1]
            self.dose_number = self.protocol[4]
            self.dose_period = self.protocol[3] 
            self.dose_amount = self.protocol[2] 
            self.administration_route = administrationRoute

    def calculate_nca(self):
        """
        Calculates and stores all single dose NCA parameters
        :return: None
        """
        self.dosing_times = self._dosing_times()
        self.auc_0_last = self._auc_0_last()
        self.lambda_z, self.r2, self.num_points = self._lambda_z()
        self.auc_infinity = self._auc_infinity()
        self.auc_tau = self._auc_tau()
        self.aumc_tau = self._aumc_tau()
        self.c_avg = self._c_avg()
        self.c_min = self._c_min()
        self.c_max = self._c_max()
        self.ptf_percent = self._ptf_percent()
        self.t_min = self._t_min()
        self.mrt = self._mrt()
        self.cl = self._cl()

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
        _, intercept, _, _, _ = \
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
        y1 = y[:-1]
        x1 = x[:-1]
        y2 = y[1:]
        x2 = x[1:]

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

    def _dosing_times(self, linlog=True):
        """
        Calculates the dosing times from the protocol
        Arguments:
        :param dose_start {float} -- first dose time
        :param dose_number {float} -- number of doses
        :param dose_period {float} -- time between each dose
        Returns:
        :return dosing_times {np.ndarray} -- array of dosing times
        """
        dosing_times = range(self.dose_start, (self.dose_start+self.dose_number*self.dose_period), self.dose_period)
        return dosing_times

    def _auc_0_last(self, linlog=True):
        """
        Calculates area under the concentration–time curve (auc) from time 0 to
        the last time point Tlast using linear-log trapezoidal method
        Arguments:
        :param y {np.ndarray} -- concentrations recorded
        :param x {np.ndarray} -- time stamps of the records
        Returns:
        :return auc {float} -- auc
        """
        y = self.concentrations
        x = self.times
        auc = self.linlog_trapz(y, x, linlog=linlog)
        return auc

    def _lambda_z(self):
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
        y = self.concentrations
        x = self.times
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

    def _auc_infinity(self):
        """
        Calculate total area under the concentration–time curve extrapolating
        to Inf using the terminal rate constant Lambda_z.
        :return: auc_inf {float} auc-Inf
        """
        auc_inf = self.auc_0_last + self.concentrations[-1] / self.lambda_z
        return auc_inf


    def _auc_tau(self, linlog=True):
        """
        Calculates area under the concentration–time curve (auc) from a dose to
        the following using linear-log trapezoidal method
        Arguments:
        :param y {np.ndarray} -- concentrations recorded
        :param x {np.ndarray} -- time stamps of the records
        Returns:
        :return auc_array {np.ndarray} -- array of auc for each dose
        """
        auc_array=np.zeros(self.dose_number)

        for i in range(0,self.dose_number-1):
            mask = (self.times[:,0] >= self.dosing_times[i]) & (self.times[:,0] >= self.dosing_times[i]+self.dose_period)
            x = self.times[mask,:]
            y = self.concentrations[mask,:]
            auc_array[i] = self.linlog_trapz(y, x, linlog=linlog)
        
        return auc_array

    def _aumc_tau(self, linlog=True):
        """
        Calculate area under the first moment of the concentration–time curve
        (aumc) from a dose to the following using linear-log trapezoidal method
        Arguments:
        :param y {np.ndarray} -- concentrations recorded
        :param x {np.ndarray} -- time stamps of the records
        Returns:
        :return aumc_array {np.ndarray} -- array of aumc for each dose
        """
        aumc_array=np.zeros(self.dose_number)

        for i in range(0,self.dose_number-1):
            mask = (self.times[:,0] >= self.dosing_times[i]) & (self.times[:,0] >= self.dosing_times[i]+self.dose_period)
            x = self.times[mask,:]
            y = self.concentrations[mask,:]*x
            aumc_array[i] = self.linlog_trapz(y, x, linlog=linlog)
        
        return aumc_array

    def _c_avg(self):
        """
        Calculates the average concentration between each dose
        Arguments:
        :param auc_tau {np.ndarray} -- area under the curve of the concentration
        :param dose_period {float} -- time between two doses
        Returns:
        :return c_avg {np.ndarray} -- average concentration array
        """
        if self.period>0:
            c_avg=self.auc_tau/self.dose_period
        else:
            c_avg=np.zeros(self.dose_number)

        return c_avg

    def _c_min(self):
        """
        Returns the minimal concentration during a period between two doses
        Arguments:
        :param y {np.ndarray} -- concentrations recorded
        Returns:
        :return c_min_array {np.ndarray} -- minimal concentrations between each doses
        """
        c_min_array=np.zeros(self.dose_number)

        for i in range(0,self.dose_number-1):
            mask = (self.times[:,0] >= self.dosing_times[i]) & (self.times[:,0] >= self.dosing_times[i]+self.dose_period)
            y = self.concentrations[mask,:]
            c_min_array[i] = np.amin(y)
        
        return c_min_array

    def _c_max(self):
        """
        Returns the maximal concentration during a period between two doses
        Arguments:
        :param y {np.ndarray} -- concentrations recorded
        Returns:
        :return c_max_array {np.ndarray} -- maximal concentrations between each doses
        """
        c_max_array=np.zeros(self.dose_number)

        for i in range(0,self.dose_number-1):
            mask = (self.times[:,0] >= self.dosing_times[i]) & (self.times[:,0] >= self.dosing_times[i]+self.dose_period)
            y = self.concentrations[mask,:]
            c_max_array[i] = np.amax(y)
        
        return c_max_array
        

    def _ptf_percent(self):
        """
        Peak trough fluctuation over one dosing interval at steady state.
        Arguments:
        :param c_max {np.ndarray} -- maximal concentrations between each doses
        :param c_min {np.ndarray} -- minimal concentrations between each doses
        :param c_avg {np.ndarray} -- average concentrations between each doses
        """
        ptf_percent=100*(self.c_max-self.c_min)/self.c_avg
        return ptf_percent

    def _t_min(self):
        """
        Time at which the minimum concentration is reached in a dosing interval.
        Arguments:
        :param y {np.ndarray} -- concentrations recorded
        :param x {np.ndarray} -- time stamps of the records
        Returns:
        :return t_min_array {np.ndarray} -- times where the minimal concentrations 
                                            are reached in each dosing interval
        """
        t_min_array=np.zeros(self.dose_number)

        for i in range(0,self.dose_number-1):
            mask = (self.times[:,0] >= self.dosing_times[i]) & (self.times[:,0] >= self.dosing_times[i]+self.dose_period)
            x = self.times[mask,:]
            y = self.concentrations[mask,:]
            t_min_array[i] = x[np.argmin(y)]
        
        return t_min_array

    def _mrt(self):
        """
        Mean residence time.
        Arguments:
        :param aumc_tau {np.ndarray} -- aumc array for each dose
        :param auc_0_last {float} -- auc from time 0 to last time point
        :param auc_infinity {float} -- auc from 0 to infinity, after extrapolating 
                                       time curve to infinity with lambda_z rate constant
        Returns:
        :return mrt {np.ndarray} -- mean residence time for each dosing interval
        """
        mrt = (self.aumc_tau+self.dose_period*(self.auc_infinity-self.auc_0_last))/self.auc_tau
        return mrt

    def _cl(self):
        """
        Total drug clearance
        Arguments:
        :param auc_tau {np.ndarray} -- auc array for each dose
        :param dose_amount {float} -- amount of drug administered at each dose
        Returns:
        :return cl {np.ndarray} -- array of recorded clearances at each dosing interval
        """
        cl = self.auc_tau*(1/self.dose_amount)
        return cl