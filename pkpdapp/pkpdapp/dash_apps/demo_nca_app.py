#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import dash_core_components as dcc
import dash_html_components as html
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
import scipy.stats as stats
from .base import BaseApp


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


class NcaApp(BaseApp):
    """
    """

    def __init__(self, name, data_meas, data_dose, subject_id):
        super(NcaApp, self).__init__(name)

        self._id_key = 'ID'
        self._time_key = 'Time'
        self._obs_type_key = 'Biomarker'
        self._obs_key = 'Measurement'
        self._amount_key = 'Amount'
        self._compound_key = 'Compound'

        self._fig = None

        self._rounding = 3

        print(data_meas)
        print(data_dose)
        print('got subject_id', subject_id)

        self._dose_amount = data_dose[self._amount_key][0]
        self._drug = data_dose[self._compound_key][0]

        self._subject_id = subject_id
        self._process_data(data_meas, self._dose_amount)
        self._fig = self._create_figure()
        self.set_layout()

    def _process_data(self, df, dose_amount):
        df_single = df.sort_values([self._time_key], ascending=True)
        df_single = df_single.astype({self._obs_key: 'float64'})
        df_single['Dose-Normalised'] = df_single[self._obs_key] / dose_amount

        nca = NCA(
            np.asarray(df_single[self._time_key]),
            np.asarray(df_single[self._obs_key]),
            dose_amount, doseSchedule='Single', administrationRoute='IVBolus'
        )
        nca.calculate_nca()

        first_point = np.asarray(
            df_single[
                df_single[self._time_key] == df_single[self._time_key].min()
            ][[self._time_key, self._obs_key]])[0]

        last_point = np.asarray(
            df_single[
                df_single[self._time_key] == df_single[self._time_key].max()
            ][[self._time_key, self._obs_key]])[0]

        max_point = [nca.T_max, nca.C_max]

        if 0.0 not in df_single[self._time_key].values:
            before = np.asarray([first_point, [0.0, nca.C_0]])

        after = np.asarray([
            last_point,
            [last_point[0] + 0.5 * nca.T_half, last_point[1] * 0.75],
            [last_point[0] + nca.T_half, last_point[1] * 0.5]
        ])

        self._df_single = df_single
        self._nca = nca
        self._first_point = first_point
        self._last_point = last_point
        self._max_point = max_point
        self._before = before
        self._after = after

    def _create_figure(self):
        # Create figure
        # Visualisation using Plotly
        y_label = self._drug + " Concentration"
        x_label = "Time"
        main_title = self._drug + \
            " Concentration for ID" + str(self._subject_id)
        hex_colour = px.colors.qualitative.Plotly[0]

        # Make the scatter plot
        fig = px.scatter(
            self._df_single,
            title=main_title,
            x=self._time_key,
            y=self._obs_key,
        )

        fig.update_xaxes(
            title_text=x_label,
            range=[0, self._last_point[0] * 1.1]
        )
        fig.update_yaxes(title_text=y_label)
        fig.update_traces(mode='markers+lines')
        fig['data'][0]['showlegend'] = True
        fig['data'][0]['name'] = 'Observed Values'

        # Assign settings for the Plot
        AUC_fill = ['tozeroy']
        AUMC_fill = ['None']
        AUC_visibility = [True]
        AUMC_visibility = [False]
        Data_visibility = [True]
        Tmax_visibility = [True]

        font_family = "Courier New, monospace"

        # Extrapolation

        C0_text = "C_0 = " + str(round(self._nca.C_0, self._rounding))
        text = ["", C0_text]

        fig.add_trace(
            go.Scatter(
                x=self._before[:, 0],
                y=self._before[:, 1],
                mode='lines',
                line={'dash': 'dash', 'color': hex_colour},
                name='Extrapolation',
                visible=False,
                hovertemplate='<b>%{text}</b>',
                text=[text[i].format(i + 1) for i in range(2)]
            )
        )

        T_half_text = "T_half = " + \
            str(round(self._nca.T_half, self._rounding))
        text = ["", T_half_text, T_half_text]

        fig.add_trace(
            go.Scatter(
                x=self._after[:, 0], y=self._after[:, 1],
                mode='lines',
                line={'dash': 'dash', 'color': "cyan"},
                name='Extrapolation',
                visible=False,
                hovertemplate='<b>%{text}</b>',
                text=[text[i].format(i + 1) for i in range(3)]
            )
        )

        # Assign settings for the Extrapolated points
        AUC_fill = AUC_fill + ['tozeroy'] * 2
        AUMC_fill = AUMC_fill + ['None'] * 2
        AUC_visibility = AUC_visibility + [True] * 2
        AUMC_visibility = AUMC_visibility + [False] * 2
        Data_visibility = Data_visibility + [False] * 2
        Tmax_visibility = Tmax_visibility + [True] * 2

        # Extrapolation text
        lambdaz_text = " Lambda_z = " + \
            str(round(self._nca.Lambda_z, self._rounding)) + \
            "<br> T_half = " + str(round(self._nca.T_half, self._rounding)) + \
            "<br> Num_points = " + str(self._nca.Num_points) + \
            "<br> R2 = " + str(round(self._nca.R2, self._rounding))
        num_on_line = 100
        text = [lambdaz_text] * num_on_line

        hover_point = [
            np.linspace(self._after[0, 0], self._after[-1, 0], num_on_line),
            np.linspace(self._after[0, 1], self._after[-1, 1], num_on_line)
        ]
        fig.add_trace(
            go.Scatter(
                x=hover_point[0], y=hover_point[1],
                mode='markers',
                marker=dict(opacity=0,
                            size=5),
                name='',
                visible=False,
                showlegend=False,
                hovertemplate='<b>%{text}</b>',
                text=[text[i].format(i + 1) for i in range(num_on_line)]
            )
        )

        # Assign settings for the Extrapolated points
        AUC_fill = AUC_fill + ['None']
        AUMC_fill = AUMC_fill + ['None']
        AUC_visibility = AUC_visibility + [False]
        AUMC_visibility = AUMC_visibility + [False]
        Data_visibility = Data_visibility + [False]
        Tmax_visibility = Tmax_visibility + [True]

        # First Moment Data (Time*Concentration)
        first_moment_y = np.asarray(self._df_single[self._obs_key]) \
            * np.asarray(self._df_single[self._time_key])
        fig.add_trace(
            go.Scatter(
                x=np.asarray(self._df_single[self._time_key]),
                y=first_moment_y,
                mode='lines+markers',
                line={'dash': 'solid', 'color': hex_colour},
                marker=dict(color=hex_colour),
                name='First Moment',
                visible=False
            )
        )

        # Assign settings for the First Moment
        AUC_fill = AUC_fill + ['None']
        AUMC_fill = AUMC_fill + ['tozeroy']
        AUMC_visibility = AUMC_visibility + [True]
        AUC_visibility = AUC_visibility + [False]
        Data_visibility = Data_visibility + [False]
        Tmax_visibility = Tmax_visibility + [False]

        # First Moment Extrapolation
        C0_text = "C_0 = " + str(round(self._nca.C_0, self._rounding))
        text = ["", C0_text]

        fig.add_trace(
            go.Scatter(
                x=self._before[:, 0],
                y=self._before[:, 1] * self._before[:, 0],
                mode='lines',
                line={'dash': 'dash', 'color': hex_colour},
                name='Extrapolation',
                visible=False,
                hovertemplate='<b>%{text}</b>',
                text=[text[i].format(i + 1) for i in range(2)]
            )
        )

        T_half_text = "T_half = " + \
            str(round(self._nca.T_half, self._rounding))
        text = ["", T_half_text, T_half_text]

        first_moment_after = self._after[:, 1] * self._after[:, 0]
        fig.add_trace(
            go.Scatter(
                x=self._after[:, 0], y=first_moment_after,
                mode='lines',
                line={'dash': 'dash', 'color': "cyan"},
                name='Extrapolation',
                visible=False,
                hovertemplate='<b>%{text}</b>',
                text=[text[i].format(i + 1) for i in range(3)]
            )
        )

        # Assign settings for the First Moment Extrapolated points
        AUC_fill = AUC_fill + ['None'] * 2
        AUMC_fill = AUMC_fill + ['tozeroy'] * 2
        AUMC_visibility = AUMC_visibility + [True] * 2
        AUC_visibility = AUC_visibility + [False] * 2
        Data_visibility = Data_visibility + [False] * 2
        Tmax_visibility = Tmax_visibility + [False] * 2


# AUMC
        hover_point = [
            0.5 * (max(self._df_single[self._time_key]) +
                   min(self._df_single[self._time_key])),
            max(first_moment_y) * 0.5
        ]
        AUMC_text = "AUMC_0_last = " + \
            str(round(self._nca.AUMC_0_last, self._rounding))
        text = [AUMC_text]

        fig.add_trace(
            go.Scatter(
                x=[hover_point[0]], y=[hover_point[1]],
                mode='markers',
                marker=dict(opacity=0,
                            size=40),
                name='AUMC',
                visible=False,
                showlegend=False,
                hovertemplate='<b>%{text}</b>',
                text=[text[i].format(i + 1) for i in range(1)]
            )
        )

        hover_point = [self._last_point[0] * 1.05,
                       self._last_point[1] * self._last_point[0] * 0.5]
        AUMC_inf_text = " AUMC = " + \
            str(round(self._nca.AUMC, self._rounding)) + \
            "<br> AUMC_extrap_percent = " + \
            str(round(self._nca.AUMC_extrap_percent, self._rounding))
        text = [AUMC_inf_text]
        fig.add_trace(
            go.Scatter(
                x=[hover_point[0]], y=[hover_point[1]],
                mode='markers',
                marker=dict(opacity=0,
                            size=0.5),
                name='AUMC',
                visible=False,
                showlegend=False,
                hovertemplate='<b>%{text}</b>',
                text=[text[i].format(i + 1) for i in range(1)]
            )
        )

        # AUMC Text
        fig.add_trace(go.Scatter(x=[self._last_point[0]],
                                 y=[max(first_moment_y)],
                                 mode='text',
                                 text=[AUMC_text + '<br>' + AUMC_inf_text],
                                 textposition="bottom left",
                                 textfont=dict(
            family=font_family,
            size=16,
            color='black'
        ),
            name="",
            showlegend=False,
            visible=False
        )
        )
# Assign settings for the AUMC
        AUC_fill = AUC_fill + ['None'] * 3
        AUMC_fill = AUMC_fill + ['None'] * 3
        AUC_visibility = AUC_visibility + [False] * 3
        AUMC_visibility = AUMC_visibility + [True] * 3
        Data_visibility = Data_visibility + [False] * 3
        Tmax_visibility = Tmax_visibility + [False] * 3

# AUC
        hover_point = [self._max_point[0], self._max_point[1] * 0.5]
        AUC_text = "AUC_0_last = " + \
            str(round(self._nca.AUC_0_last, self._rounding))
        text = [AUC_text]

        fig.add_trace(
            go.Scatter(
                x=[hover_point[0]], y=[hover_point[1]],
                mode='markers',
                marker=dict(opacity=0,
                            size=40),
                name='AUC',
                visible=False,
                showlegend=False,
                hovertemplate='<b>%{text}</b>',
                text=[text[i].format(i + 1) for i in range(1)]
            )
        )

        hover_point = [self._last_point[0] * 1.05, self._last_point[1] * 0.5]
        AUC_inf_text = \
            " AUC_infinity = " + \
            str(round(self._nca.AUC_infinity, self._rounding)) + \
            "<br> AUC_infinity_dose = " + \
            str(round(self._nca.AUC_infinity_dose, self._rounding)) + \
            "<br> AUC_extrap_percent = " + \
            str(round(self._nca.AUC_extrap_percent, self._rounding))
        text = [AUC_inf_text]
        fig.add_trace(
            go.Scatter(
                x=[hover_point[0]], y=[hover_point[1]],
                mode='markers',
                marker=dict(opacity=0,
                            size=0.5),
                name='AUC',
                visible=False,
                showlegend=False,
                hovertemplate='<b>%{text}</b>',
                text=[text[i].format(i + 1) for i in range(1)]
            )
        )

        # AUC Text
        fig.add_trace(go.Scatter(x=[self._last_point[0]],
                                 y=[self._max_point[1]],
                                 mode='text',
                                 text=[AUC_text + '<br>' + AUC_inf_text],
                                 textposition="bottom left",
                                 textfont=dict(
            family=font_family,
            size=16,
            color='black'
        ),
            name="",
            showlegend=False,
            visible=False
        )
        )
        # Assign settings for the AUC
        AUC_fill = AUC_fill + ['None'] * 3
        AUMC_fill = AUMC_fill + ['None'] * 3
        AUC_visibility = AUC_visibility + [True] * 3
        AUMC_visibility = AUMC_visibility + [False] * 3
        Data_visibility = Data_visibility + [False] * 3
        Tmax_visibility = Tmax_visibility + [False] * 3

        # Tmax and Cmax
        Tmax_text = "T_max = " + str(self._max_point[0])
        Cmax_text = "C_max = " + str(self._max_point[1])
        text = [Tmax_text, "", Cmax_text]

        fig.add_trace(
            go.Scatter(
                x=[self._max_point[0], self._max_point[0], 0],
                y=[0, self._max_point[1], self._max_point[1]],
                mode='lines',
                line=dict(color=hex_colour,
                          dash="dashdot"
                          ),
                # name="T_max/C_max",
                name="",
                showlegend=False,
                visible=False,
                hovertemplate='<b>%{text}</b>',
                text=[text[i].format(i + 1) for i in range(3)],
            )
        )

        # Maximum Text
        fig.add_trace(go.Scatter(x=[self._last_point[0]],
                                 y=[self._max_point[1]],
                                 mode='text',
                                 text=[Cmax_text + '<br>' +
                                       C0_text + '<br>' + lambdaz_text],
                                 textposition="bottom left",
                                 textfont=dict(
            family=font_family,
            size=16,
            color='black'
        ),
            name="",
            showlegend=False,
            visible=False
        )
        )
        # Assign settings for the Maximum
        AUC_fill = AUC_fill + ['None'] * 2
        AUMC_fill = AUMC_fill + ['None'] * 2
        AUC_visibility = AUC_visibility + [False] * 2
        AUMC_visibility = AUMC_visibility + [False] * 2
        Data_visibility = Data_visibility + [False] * 2
        Tmax_visibility = Tmax_visibility + [True] * 2

        fig.update_layout(template="plotly_white")

        # create buttons
        fig.update_layout(
            updatemenus=[
                # Drop down menu for changing NCA view
                dict(
                    active=0,
                    buttons=list([
                        dict(
                            args=[{'fill': ['None'],
                                   'visible': Data_visibility,
                                   },
                                  ],
                            method="update",
                            label="Data"
                        ),
                        dict(
                            args=[{'fill': ['None'],
                                   'visible': Tmax_visibility
                                   },
                                  ],
                            label="Maximum and Extrapolation",
                            method="update"
                        ),
                        dict(
                            args=[{'fill': AUC_fill,
                                   'visible': AUC_visibility
                                   },
                                  ],
                            method="update",
                            label="Area Under the Curve"
                        ),
                        dict(
                            method="update",
                            args=[{'fill': AUMC_fill,
                                   'visible': AUMC_visibility,
                                   },
                                  ],
                            label="Area Under the First Moment"
                        )
                    ]),
                    direction="down",
                    pad={"r": 10, "t": 10},
                    showactive=True,
                    x=0.1,
                    xanchor="left",
                    y=1.1,
                    yanchor="top"
                ),
                # Button for linear versus log scale
                dict(
                    type="buttons",
                    direction="left",
                    buttons=list([
                        dict(
                            args=[{"yaxis.type": "linear"}],
                            label="Linear y-scale",
                            method="relayout"
                        ),
                        dict(
                            args=[{"yaxis.type": "log"}],
                            label="Log y-scale",
                            method="relayout"
                        )
                    ]),
                    pad={"r": 0, "t": -10},
                    showactive=True,
                    x=1.0,
                    xanchor="right",
                    y=1.15,
                    yanchor="top"
                ),
            ]
        )

        return fig

    def set_layout(self):
        # Create dash app
        self.app.layout = html.Div(
            children=[
                dcc.Graph(
                    id='nca-dashboard',
                    figure=self._fig,
                    style={'height': '100%'}
                )
            ],
        )
