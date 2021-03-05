#
# This file is part of PKDPApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

"""
This is just temporary placeholder for an app that
will visualise the NCA functionalities.
"""

import dash_core_components as dcc
import dash_html_components as html
from django.conf import settings
from django_plotly_dash import DjangoDash
import myokit
import myokit.formats.sbml as sbml
import numpy as np
import pandas as pd
import pints
import plotly.colors
import plotly.express as px
import plotly.graph_objects as go
import scipy.stats as stats
from .base import BaseApp


class NCA():
    def __init__(self, time, conc, DM, doseSchedule='Single', administrationRoute='IVBolus'):
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
            self.is_c0extrapolated = False  #initial concentration measured
            self.time = time
            self.conc = conc
            self.DM = DM  # dose amount
            self.C_0 = None  # not extrapolated
            self.administrationRoute = administrationRoute
        else:
            self.is_c0extrapolated = True  #initial concentration NOT measured
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
        #self.C_0 = self._C_0()
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
        """Calculate initial concentration when not given,
        computed using a (log) regression of the first two data points in a profile.

        Arguments:
        y {np.ndarray} -- y coordinates of points on curve
        x {np.ndarray} -- x coordinates of points on curve

        Returns:
        c0 {double} -- extrapoloated c0
        """
        slope, intercept, r_value, _, _ = stats.linregress(x[:2], np.log(y[:2]), )
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
    def linlog_trapz(y, x,linlog=True):
        """Calculate area under curve using combination of linear and log trapezoidal method
        (linear when increasing, log when decreasing) or optionally just linear trapezoidal method
        :param y {np.ndarray} -- y coordinates of points on curve
        :param x {np.ndarray} -- x coordinates of points on curve
        :param linlog {bool} -- use linear-log trapezoidal method
        Returns:
        :return area {float} -- area under curve
        """
        if linlog:  # use lin-log trapezoid
            ymax_indx = np.argmax(y)  # index of maximum concentration
            area1 = np.trapz(y[:ymax_indx + 1], x[:ymax_indx + 1])  # linear trapezium for increasing part
            area2 = NCA.log_trapz(y[ymax_indx:], x[ymax_indx:])  # log trapezium for decreasing part
            area = area1 + area2
        else:  # use linear trapezoid only
            area = np.trapz(x, y)
        return area

    def _AUC_0_last(self, linlog=True):
        """Calculates area under the concentration–time curve (AUC)
         from time 0 to the last time point Tlast using linear-log trapezoidal method
        Arguments:
        :param y {np.ndarray} -- y coordinates of points on curve
        :param x {np.ndarray} -- x coordinates of points on curve
        Returns:
        :return auc {float} -- AUMC
        """
        y = self.conc
        x = self.time
        auc = self.linlog_trapz(y,x,linlog=linlog)
        return auc


    def _AUMC_0_last(self, linlog=True):
        """Calculate area under the first moment of the concentration–time curve (AUMC)
         from time 0 to the last time point Tlast using linear log trapezoidal method
        Arguments:
        :param y {np.ndarray} -- y coordinates of points on curve
        :param x {np.ndarray} -- x coordinates of points on curve
        Returns:
        :return aumc {float} -- AUMC
        """
        y = self.conc * self.time  # conc * time for first moment curve
        x = self.time
        aumc = self.linlog_trapz(y,x, linlog=linlog)
        return aumc

    def _Lambda_z(self):
        """
        Calculates terminal rate constant by performing set of linear regressions on log(conc)-time data
        using the last n (=3,4,...) points from the terminal (decreasing T >= Tmax) section of curve and
        returning rate constant with maximum adj_r
        :return lambda_z {float} -- terminal rate constant
        :return R2 {float} -- coefficient of determination for best linear regression
        :return m {int} -- number of data points used in best linear regression
        """
        y = self.conc
        x = self.time
        r = 0
        lambda_z = 0
        cmax_indx = np.argmax(y)  #  index of max concentration
        n_upper = len(y) - cmax_indx  # max number of points to consider
        for n in range(3, n_upper + 1):  # perform regressions
            slope, intercept, r_value, _, _ = stats.linregress(x[-n:], np.log(y[-n:]))
            adj_r = 1 - ((1 - r_value ** 2) * (n - 1)) / (n - 2)
            # Update lambda, r and m if adj_r has increased
            if adj_r > r:
                r = adj_r
                lambda_z = np.abs(slope)
                m = n
        return lambda_z, r ** 2, m

    def _AUC_infinity(self):
        """
        Calculate total area under the concentration–time curve extrapolating to Inf
         using the terminal rate constant Lambda_z.
        :return: auc_inf {float} AUC-Inf
        """
        auc_inf = self.AUC_0_last + self.conc[-1] / self.Lambda_z
        return auc_inf

    def _AUC_infinity_dose(self):
        """
        Calculate AUC-Infinity divided by administered dose amount
        :return: {float} -- AUC-Inf Dose = AUC-Inf/DM
        """
        return self.AUC_infinity/self.DM

    def _AUC_extrap_percent(self):
        """
        Calculate fraction of total AUC_infinity obtained from extrapolation
        :return {float} -- extrapolated percentage
        """
        return 100*(self.AUC_infinity - self.AUC_0_last)/self.AUC_infinity

    def _CL(self):
        """
        Calculate total drug clearance (DM/AUC-Inf)
        :return {float} -- total drug clearance CL = DM/AUC-Inf
        """
        return self.DM/self.AUC_infinity

    def _find_Cmax(self):
        """
        Find maximum observed concentration and corresponding time
        :return {float} -- max concentration
        :return {float} -- time of max conc
        """
        if self.is_c0extrapolated: # ignore extrapolated c0
            indx = np.argmax(self.conc[1:]) + 1 # index of maximum
        else:
            indx = np.argmax(self.conc)
        return self.conc[indx], self.time[indx]

    def _C_max_Dose(self):
        """
        Calculate CmaxDose
        :return: {float} -- CmaxDose =  Cmax/DM
        """
        return self.C_max/self.DM

    def _AUMC(self):
        """
        Calculate area under the first moment of the concentration–time curve extrapolated to Inf
        :return: aumc {float} -- AUMC
        """
        aumc =  self.AUMC_0_last + self.conc[-1]/(self.Lambda_z**2) + self.time[-1] * self.conc[-1] / self.Lambda_z
        return aumc

    def _AUMC_extrap_percent(self):
        """
        Calculate fraction of total AUMC obtained from extrapolation
        :return {float} -- extrapolated percentage
        """
        return 100*(self.AUMC - self.AUMC_0_last)/self.AUMC

    def _MRT(self):
        """
        Calculate mean residence time (MRT) of drug
        :return: {float} -- MRT = AUMC/AUC-Inf
        """
        return self.AUMC/self.AUC_infinity

    def _Tlast(self):
        """
        :return: {float} -- time of last observed concentration value
        """
        return self.time[-1]

    def _T_half(self):
        """
        Calculate terminal half life of drug (time to decay to half amount under terminal rate constant)
        :return: {float} -- terminal half life
        """
        return np.log(2)/self.Tlast

    def _V_ss(self):
        """
        Calculate apparent volume of distribution at equilibrium. (IV Bolus doses only).
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
    def __init__(self, name, data):
        super(NcaApp, self).__init__(name)

        self._id_key = 'ID'
        self._time_key = 'Time'
        self._biom_key = 'Biomarker'
        self._meas_key = 'Measurement'

        self._fig = None

        # Create defaults
        self._multiple_models = True
        self._models = []
        self._use_models = []
        self._model_names = []
        self._parameters = []
        self._models_traces = []
        self._datasets = []
        self._use_datasets = []
        self._dataset_names = []
        self._data_biomarkers = set()
        self._use_biomarkers = None
        self._slider_ids = []
        self._slider_tabs = []
        self._times = np.linspace(start=0, stop=30)



# Import data
path = settings.MEDIA_ROOT
df = pd.read_csv(path + '/data/demo_pk_data.csv')
drug= 'Docetaxel'
df = df.sort_values(['DOSE', 'TIME'], ascending=True)
df_conc = df.loc[((df['DRUG'] == drug) | (df['DRUG'] == 'Controls'))&(df['YNAME'] == drug)]
df_conc = df_conc.drop(df_conc[df_conc['OBS'] == '.'].index)

df_conc = df_conc.astype({'OBS': 'float64', 'DOSE': 'float64'})
df_conc['Dose-Normalised'] = df_conc['OBS']/df_conc['DOSE']

x_label = "Time, hours"
y_label = drug + ", " + df_conc['UNIT'].values[0]
dose_categories = df_conc.DOSE.unique()

rat_id = df_conc['ID'].unique()[0]
df_single = df_conc.loc[(df_conc['ID'] == rat_id)]
df_single = df_single[['TIME', 'OBS', 'DOSE']]
dose_amount = df[df.ID == rat_id]['AMT'].unique()
dose_amount = float(dose_amount[dose_amount != '.'][0])

rat_nca = NCA(np.asarray(df_single['TIME']), np.asarray(df_single['OBS']), dose_amount, doseSchedule='Single', administrationRoute='IVBolus')
rat_nca.calculate_nca()

first_point = np.asarray(df_single[df_single.TIME == df_single.TIME.min()][['TIME', 'OBS']])[0]

last_point = np.asarray(df_single[df_single.TIME == df_single.TIME.max()][['TIME', 'OBS']])[0]

max_point = [rat_nca.T_max, rat_nca.C_max]

if 0.0 not in df_single['TIME'].values:
  before = np.asarray([first_point, [0.0, rat_nca.C_0]])

after = np.asarray([last_point,[last_point[0]+0.5*rat_nca.T_half, last_point[1]*0.75], [last_point[0]+rat_nca.T_half, last_point[1]*0.5]])

rounding = 3

# Create figure
# Visualisation using Plotly
y_label = drug + " Concentration"
x_label = "Time"
main_title = drug + " Concentration for Rat " + str(rat_id)
hex_colour = px.colors.qualitative.Plotly[0]

# Make the scatter plot
fig = px.scatter(
    df_single,
    title=main_title,
    x="TIME",
    y="OBS",
    height=550,
)

fig.update_xaxes(title_text=x_label, range=[0, last_point[0]*1.1])
fig.update_yaxes(title_text=y_label)
fig.update_traces(mode='markers+lines')
fig['data'][0]['showlegend']=True
fig['data'][0]['name']='Observed Values'

# Assign settings for the Plot
AUC_fill=['tozeroy']
AUMC_fill=['None']
AUC_visibility=[True]
AUMC_visibility=[False]
Data_visibility=[True]
Tmax_visibility=[True]

font_family="Courier New, monospace"

# Extrapolation

C0_text = "C_0 = " + str(round(rat_nca.C_0, rounding))
text=["", C0_text]

fig.add_trace(go.Scatter(x=before[:,0],
                    y=before[:,1],
                    mode='lines',
                    line={'dash': 'dash', 'color': hex_colour},
                    name='Extrapolation',
                    visible=False,
                    hovertemplate = '<b>%{text}</b>',
                    text = [text[i].format(i + 1) for i in range(2)]))

T_half_text = "T_half = " + str(round(rat_nca.T_half, rounding))
text=["", T_half_text, T_half_text]

fig.add_trace(go.Scatter(x=after[:,0], y=after[:,1],
                    mode='lines',
                    line={'dash': 'dash', 'color': "cyan"},
                    name='Extrapolation',
                    visible=False,
                    hovertemplate = '<b>%{text}</b>',
                    text = [text[i].format(i + 1) for i in range(3)]))

# Assign settings for the Extrapolated points
AUC_fill=AUC_fill+['tozeroy']*2
AUMC_fill=AUMC_fill+['None']*2
AUC_visibility=AUC_visibility+[True]*2
AUMC_visibility=AUMC_visibility+[False]*2
Data_visibility=Data_visibility+[False]*2
Tmax_visibility=Tmax_visibility+[True]*2

# Extrapolation text
lambdaz_text = " Lambda_z = " + str(round(rat_nca.Lambda_z, rounding))+ \
                "<br> T_half = " + str(round(rat_nca.T_half, rounding))+ \
                "<br> Num_points = " + str(rat_nca.Num_points)+ \
                "<br> R2 = " + str(round(rat_nca.R2, rounding))
num_on_line = 100
text = [lambdaz_text]*num_on_line
hover_point = [np.linspace(after[0,0], after[-1, 0], num_on_line), np.linspace(after[0,1], after[-1, 1], num_on_line)]
fig.add_trace(go.Scatter(x=hover_point[0], y=hover_point[1],
                    mode='markers',
                    marker=dict(opacity=0,
                                size=5),
                    name='',
                    visible=False,
                    showlegend=False,
                    hovertemplate = '<b>%{text}</b>',
                    text = [text[i].format(i + 1) for i in range(num_on_line)]))

# Assign settings for the Extrapolated points
AUC_fill=AUC_fill+['None']
AUMC_fill=AUMC_fill+['None']
AUC_visibility=AUC_visibility+[False]
AUMC_visibility=AUMC_visibility+[False]
Data_visibility=Data_visibility+[False]
Tmax_visibility=Tmax_visibility+[True]

# First Moment Data (Time*Concentration)
first_moment_y = np.asarray(df_single["OBS"])*np.asarray(df_single["TIME"])
fig.add_trace(go.Scatter(x=np.asarray(df_single["TIME"]),
                    y=first_moment_y,
                    mode='lines+markers',
                    line={'dash': 'solid', 'color': hex_colour},
                    marker=dict(color=hex_colour),
                    name='First Moment',
                    visible=False
                    ))
# Assign settings for the First Moment
AUC_fill=AUC_fill+['None']
AUMC_fill=AUMC_fill+['tozeroy']
AUMC_visibility=AUMC_visibility+[True]
AUC_visibility=AUC_visibility+[False]
Data_visibility=Data_visibility+[False]
Tmax_visibility=Tmax_visibility+[False]


# First Moment Extrapolation
C0_text = "C_0 = " + str(round(rat_nca.C_0, rounding))
text=["", C0_text]

fig.add_trace(go.Scatter(x=before[:,0],
                    y=before[:,1]*before[:,0],
                    mode='lines',
                    line={'dash': 'dash', 'color': hex_colour},
                    name='Extrapolation',
                    visible=False,
                    hovertemplate = '<b>%{text}</b>',
                    text = [text[i].format(i + 1) for i in range(2)]))

T_half_text = "T_half = " + str(round(rat_nca.T_half, rounding))
text=["", T_half_text, T_half_text]

first_moment_after = after[:,1]*after[:,0]
fig.add_trace(go.Scatter(x=after[:,0], y=first_moment_after,
                    mode='lines',
                    line={'dash': 'dash', 'color': "cyan"},
                    name='Extrapolation',
                    visible=False,
                    hovertemplate = '<b>%{text}</b>',
                    text = [text[i].format(i + 1) for i in range(3)]))

# Assign settings for the First Moment Extrapolated points
AUC_fill=AUC_fill+['None']*2
AUMC_fill=AUMC_fill+['tozeroy']*2
AUMC_visibility=AUMC_visibility+[True]*2
AUC_visibility=AUC_visibility+[False]*2
Data_visibility=Data_visibility+[False]*2
Tmax_visibility=Tmax_visibility+[False]*2


#AUMC
hover_point = [0.5*(max(df_single["TIME"])+min(df_single["TIME"])), max(first_moment_y)*0.5]
AUMC_text = "AUMC_0_last = " + str(round(rat_nca.AUMC_0_last, rounding))
text = [AUMC_text]

fig.add_trace(go.Scatter(x=[hover_point[0]], y=[hover_point[1]],
                    mode='markers',
                    marker=dict(opacity=0,
                                size=40),
                    name='AUMC',
                    visible=False,
                    showlegend=False,
                    hovertemplate = '<b>%{text}</b>',
                    text = [text[i].format(i + 1) for i in range(1)]))

hover_point = [last_point[0]*1.05, last_point[1]*last_point[0]*0.5]
AUMC_inf_text =" AUMC = " + str(round(rat_nca.AUMC, rounding))+ \
            "<br> AUMC_extrap_percent = " + str(round(rat_nca.AUMC_extrap_percent, rounding))
text = [AUMC_inf_text]
fig.add_trace(go.Scatter(x=[hover_point[0]], y=[hover_point[1]],
                    mode='markers',
                    marker=dict(opacity=0,
                                size=0.5),
                    name='AUMC',
                    visible=False,
                    showlegend=False,
                    hovertemplate = '<b>%{text}</b>',
                    text = [text[i].format(i + 1) for i in range(1)]))

#AUMC Text
fig.add_trace(go.Scatter(x= [last_point[0]],
                      y=[max(first_moment_y)],
                      mode='text',
                      text = [AUMC_text + '<br>' + AUMC_inf_text],
                      textposition="bottom left",
                      textfont=dict(
                        family=font_family,
                        size=16,
                        color = 'black'
                        ),
                      name="",
                      showlegend=False,
                      visible=False
                        )
              )
# Assign settings for the AUMC
AUC_fill=AUC_fill+['None']*3
AUMC_fill=AUMC_fill+['None']*3
AUC_visibility=AUC_visibility+[False]*3
AUMC_visibility=AUMC_visibility+[True]*3
Data_visibility=Data_visibility+[False]*3
Tmax_visibility=Tmax_visibility+[False]*3

#AUC
hover_point = [max_point[0], max_point[1]*0.5]
AUC_text = "AUC_0_last = " + str(round(rat_nca.AUC_0_last, rounding))
text = [AUC_text]

fig.add_trace(go.Scatter(x=[hover_point[0]], y=[hover_point[1]],
                    mode='markers',
                    marker=dict(opacity=0,
                                size=40),
                    name='AUC',
                    visible=False,
                    showlegend=False,
                    hovertemplate = '<b>%{text}</b>',
                    text = [text[i].format(i + 1) for i in range(1)]))

hover_point = [last_point[0]*1.05, last_point[1]*0.5]
AUC_inf_text =" AUC_infinity = " + str(round(rat_nca.AUC_infinity, rounding))+ \
            "<br> AUC_infinity_dose = " + str(round(rat_nca.AUC_infinity_dose, rounding))+ \
            "<br> AUC_extrap_percent = " + str(round(rat_nca.AUC_extrap_percent, rounding))
text = [AUC_inf_text]
fig.add_trace(go.Scatter(x=[hover_point[0]], y=[hover_point[1]],
                    mode='markers',
                    marker=dict(opacity=0,
                                size=0.5),
                    name='AUC',
                    visible=False,
                    showlegend=False,
                    hovertemplate = '<b>%{text}</b>',
                    text = [text[i].format(i + 1) for i in range(1)]))

#AUC Text
fig.add_trace(go.Scatter(x= [last_point[0]],
                      y=[max_point[1]],
                      mode='text',
                      text = [AUC_text + '<br>' + AUC_inf_text],
                      textposition="bottom left",
                      textfont=dict(
                        family=font_family,
                        size=16,
                        color = 'black'
                        ),
                      name="",
                      showlegend=False,
                      visible=False
                        )
              )
# Assign settings for the AUC
AUC_fill=AUC_fill+['None']*3
AUMC_fill=AUMC_fill+['None']*3
AUC_visibility=AUC_visibility+[True]*3
AUMC_visibility=AUMC_visibility+[False]*3
Data_visibility=Data_visibility+[False]*3
Tmax_visibility=Tmax_visibility+[False]*3

# Tmax and Cmax
Tmax_text = "T_max = " + str(max_point[0])
Cmax_text = "C_max = " + str(max_point[1])
text = [Tmax_text, "", Cmax_text]

fig.add_trace(go.Scatter(x = [max_point[0], max_point[0], 0],
                          y=[0, max_point[1], max_point[1]],
                          mode='lines',
                          line=dict(color = hex_colour,
                                    dash="dashdot"
                                  ),
                          # name="T_max/C_max",
                          name="",
                          showlegend=False,
                          visible=False,
                          hovertemplate = '<b>%{text}</b>',
                          text = [text[i].format(i + 1) for i in range(3)],
                        )
              )



# Maximum Text
fig.add_trace(go.Scatter(x= [last_point[0]],
                      y=[max_point[1]],
                      mode='text',
                      text = [Cmax_text +'<br>' + C0_text +'<br>' + lambdaz_text],
                      textposition="bottom left",
                      textfont=dict(
                        family=font_family,
                        size=16,
                        color = 'black'
                        ),
                      name="",
                      showlegend=False,
                      visible=False
                        )
              )
# Assign settings for the Maximum
AUC_fill=AUC_fill+['None']*2
AUMC_fill=AUMC_fill+['None']*2
AUC_visibility=AUC_visibility+[False]*2
AUMC_visibility=AUMC_visibility+[False]*2
Data_visibility=Data_visibility+[False]*2
Tmax_visibility=Tmax_visibility+[True]*2

fig.update_layout(template="plotly_white")

# create buttons
fig.update_layout(
    updatemenus=[
        # Drop down menu for changing NCA view
        dict(
            active = 0,
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
                    args=[{'fill':AUC_fill,
                           'visible': AUC_visibility
                          },
                         ],
                    method="update",
                    label="Area Under the Curve"
                ),
                dict(
                    method="update",
                    args=[{'fill':AUMC_fill,
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
            type = "buttons",
            direction = "left",
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

# Create dash app
app = DjangoDash('NCADashBoard')

app.layout = html.Div(children=[
    dcc.Graph(
        id='simulation-dashboard',
        figure=fig
    )
])
