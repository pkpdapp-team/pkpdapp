#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

'''
Temporary demo.
'''

import numpy as np
import plotly
import plotly.colors
import plotly.graph_objects as go
from plotly.validators.scatter.marker import SymbolValidator
from scipy.optimize import curve_fit


colors = plotly.colors.qualitative.Plotly[:1000]
symbols = SymbolValidator().values


class modeling_class:
    def __init__(self):
        self.series = ""
        self.auce = 0


class AuceFigure():
    """
    """

    def __init__(self, dataset, biomarker):

        self._id_key = 'ID'
        self._time_key = 'Time'
        self._obs_type_key = 'Biomarker'
        self._obs_key = 'Measurement'
        self._dose_group_key = 'DoseGroup'
        self._group_key = 'Group'

        self._fig = go.Figure()
        self._auce_vs_concentration_fig = go.Figure()
        self._dataset = dataset
        self._auce_fit_type = 'Sigmoid'
        self._class1_selection = 'Biomarker'
        self._class2_selection = 'Group'
        self._class3_selection = None
        self._class1_plot_selection = biomarker
        self._class2_plot_selection = None
        self._class3_plot_selection = None
        self._concentration_plot_selection = None
        self._sigma_tops = []
        self._sigma_bottoms = []
        self._sigma_EC50s = []

        self._auce_vs_concentration_fig,self._sigma_tops, self._sigma_bottoms, self._sigma_EC50s = compute_auce_vs_concentration(
            self._dataset, self._auce_vs_concentration_fig,
            self._time_key, self._auce_fit_type, self._obs_key,
            self._class1_selection,
            self._dose_group_key, self._class2_selection,
            self._class3_selection, self._class1_plot_selection,
            self._class2_plot_selection, self._class3_plot_selection)

        self._fig = update_figure(
            self._dataset, self._fig,
            self._time_key, self._obs_key, self._class1_selection,
            self._dose_group_key, self._class2_selection,
            self._class3_selection, self._class1_plot_selection,
            self._concentration_plot_selection, self._class2_plot_selection,
            self._class3_plot_selection
        )

    def figures(self):
        return self._fig, self._auce_vs_concentration_fig

    def get_auce_fit(self):

        return self._sigma_tops, self._sigma_bottoms, self._sigma_EC50s


def fsigmoid(concentration, top, bottom, EC50):
    # this function simulates Emax-EC50 curve for a given concentration range
    return bottom + concentration * (top - bottom) / (EC50 + concentration)


def update_figure(dataset, fig, time_selection, y_selection, class1_selection,
                  concentration_selection, class2_selection,
                  class3_selection, class1_plot_selection,
                  concentration_plot_selection, class2_plot_selection,
                  class3_plot_selection):
    fig.data = []

    data = dataset.loc[dataset[class1_selection] == class1_plot_selection]

    if concentration_plot_selection:
        concentration = [concentration_plot_selection]
    else:
        concentration = data[concentration_selection].unique()

    for index_concentration, concentration_selected in \
            enumerate(concentration):

        concentration_data = data.loc[
            data[concentration_selection] == concentration_selected
        ]
        if class2_plot_selection:
            class2 = [class2_plot_selection]
        else:
            class2 = concentration_data[class2_selection].unique()

        for index_class2, class2_selected in enumerate(class2):

            class2_data = concentration_data.loc[
                concentration_data[class2_selection] == class2_selected
            ]

            if class3_plot_selection:
                class3 = class2_data[class3_selection].unique()

                for index_class3, class3_selected in enumerate(class3):
                    class3_data = class2_data.loc[
                        class2_data[class3_selection] == class3_selected
                    ]

                    fig.add_trace(go.Scatter(
                        x=class3_data[time_selection],
                        y=class3_data[y_selection],
                        name="%s : %s, %s : %s, %s : %s" % (
                            concentration_selection, concentration_selected,
                            class2_selection, class2_selected,
                            class3_selection, class3_selected
                        ),
                        showlegend=True,
                        visible=True,
                        hovertemplate=(
                            "<b>Measurement </b><br>" +
                            "%s : %s<br>" % (
                                class1_selection,
                                class1_plot_selection
                            ) +
                            "%s : %s<br>" % (
                                concentration_selection,
                                concentration_selected
                            ) +
                            "%s : %s<br>" % (
                                class2_selection,
                                class2_selected
                            ) +
                            "X : %{x:}<br>" +
                            "Y: %{y:}<br>" +
                            "<extra></extra>"),
                        mode="markers",
                        marker=dict(
                            symbol=symbols[index_concentration * 8],
                            opacity=0.7,
                            line=dict(color='black', width=1),
                            color=colors[index_class2]
                        )
                    ))
            else:
                fig.add_trace(go.Scatter(
                    x=class2_data[time_selection],
                    y=class2_data[y_selection],
                    name="%s : %s, %s : %s" % (
                        concentration_selection, concentration_selected,
                        class2_selection, class2_selected
                    ),
                    showlegend=True,
                    visible=True,
                    hovertemplate=(
                        "<b>Measurement </b><br>" +
                        "%s : %s<br>" % (
                            class1_selection,
                            class1_plot_selection
                        ) +
                        "%s : %s<br>" % (
                            concentration_selection,
                            concentration_selected
                        ) +
                        "%s : %s<br>" % (class2_selection, class2_selected) +
                        "X : %{x:}<br>" +
                        "Y: %{y:}<br>" +
                        "<extra></extra>"),
                    mode="markers",
                    marker=dict(
                        symbol=symbols[index_concentration * 8],
                        opacity=0.7,
                        line=dict(color='black', width=1),
                        color=colors[index_class2]
                    )
                ))
    fig.update_layout(
        # Button for linear versus log scale
        updatemenus=[
            dict(
                type="buttons",
                direction="right",
                pad={"r": 10, "t": 10},
                showactive=True,
                x=0.13,
                xanchor="left",
                y=1.21,
                yanchor="top",
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
                    ),
                    dict(
                        args=[{"xaxis.type": "linear"}],
                        label="Linear x-scale",
                        method="relayout"
                    ),
                    dict(
                        args=[{"xaxis.type": "log"}],
                        label="Log x-scale",
                        method="relayout"
                    )
                ]),
            )
        ],
        autosize=True,
        xaxis_title='Time in hours',
        yaxis_title=class1_plot_selection,
        template="plotly_white",
    ),

    return fig


def compute_auce_vs_concentration(dataset,
                                  auce_vs_concentration_fig, time_selection,
                                  auce_conc_fit_type,
                                  y_selection,
                                  class1_selection,
                                  concentration_selection, class2_selection,
                                  class3_selection, class1_plot_selection,
                                  class2_plot_selection,
                                  class3_plot_selection):

    auce_vs_concentration_fig.data = []
    auce_vs_concentration_fig.layout = {}
    data = dataset.loc[dataset[class1_selection] == class1_plot_selection]

    sigma_tops = []
    sigma_bottoms = []
    sigma_EC50s = []

    if class2_plot_selection:
        class2 = [class2_plot_selection]
    else:
        class2 = data[class2_selection].unique()

    for index_class2, class2_selected in enumerate(class2):

        class2_data = data.loc[data[class2_selection] == class2_selected]
        concentrations = class2_data[concentration_selection].unique()
        auce_vs_concentration_data = np.zeros(len(concentrations))

        for index_concentration, concentration_selected in \
                enumerate(concentrations):

            concentration_data = class2_data.loc[
                class2_data[concentration_selection] == concentration_selected
            ]

            auce_vs_concentration_data[index_concentration] = np.trapz(
                concentration_data[y_selection],
                concentration_data[time_selection]
            )

        if not (auce_conc_fit_type == 'None'):
            sigma_top, sigma_bottom, sigma_EC50= auce_fit(auce_vs_concentration_fig, auce_conc_fit_type,
                     class2_selection,
                     class2_selected, index_class2, concentrations,
                     auce_vs_concentration_data)

            sigma_tops.append(sigma_top)
            sigma_bottoms.append(sigma_bottom)
            sigma_EC50s.append(sigma_EC50)

        auce_vs_concentration_fig.add_trace(go.Scatter(
            x=concentrations,
            y=auce_vs_concentration_data,
            name="%s, %s" % (class2_selection, class2_selected),
            showlegend=True,
            visible=True,
            hovertemplate=(
                "<b>Measurement </b><br>" +
                "%s : %s<br>" % (class1_selection, class1_plot_selection) +
                "%s : %s<br>" % (class2_selection, class2_selected) +
                "X : %{x:}<br>" +
                "Y: %{y:}<br>" +
                "<extra></extra>"),
            mode="markers",
            marker=dict(
                opacity=0.7,
                line=dict(color='black', width=1),
                color=colors[index_class2]
            )
        ))

    auce_vs_concentration_fig.update_layout(
        updatemenus=[
            dict(
                type="buttons",
                direction="right",
                pad={"r": 10, "t": 10},
                showactive=True,
                x=0.13,
                xanchor="left",
                y=1.21,
                yanchor="top",
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
                    ),
                    dict(
                        args=[{"xaxis.type": "linear"}],
                        label="Linear x-scale",
                        method="relayout"
                    ),
                    dict(
                        args=[{"xaxis.type": "log"}],
                        label="Log x-scale",
                        method="relayout"
                    )
                ]),
            )
        ],
        autosize=True,
        xaxis_title='Concentration',
        xaxis_type='log',
        yaxis_title='AUCE',
        yaxis_type='linear',
        template="plotly_white",
    )

    return auce_vs_concentration_fig,sigma_tops, sigma_bottoms, sigma_EC50s


def auce_fit(auce_vs_concentration_fig, auce_conc_fit_type,
             class2_selection, class2_selected,
             index_class2, concentrations, auce_vs_concentration_data):

    sigma_top=0
    sigma_bottom=0
    sigma_EC50=0

    if auce_conc_fit_type == 'Sigmoid' and len(concentrations) >= 4:
        p0 = [
            max(auce_vs_concentration_data),
            min(auce_vs_concentration_data),
            1000
        ]
        fitted_params, covariates = curve_fit(
            fsigmoid, concentrations, auce_vs_concentration_data, p0=p0)
        fit_top, fit_bottom, fit_EC50 = fitted_params

        sigma_top, sigma_bottom, sigma_EC50 = np.sqrt(np.diag(covariates))

        if min(concentrations):
            x = np.geomspace(min(concentrations), max(concentrations), 500)
        else:
            x = np.geomspace(0.1, max(concentrations), 500)

        y = fsigmoid(x, *fitted_params)

        y_upper = fsigmoid(x, fit_top + abs(sigma_top), fit_bottom +
                           abs(sigma_bottom), fit_EC50 - abs(sigma_EC50))
        y_lower = fsigmoid(x, fit_top - abs(sigma_top), fit_bottom -
                           abs(sigma_bottom), fit_EC50 + abs(sigma_EC50))

        if (fit_EC50 > 0 and sigma_bottom and sigma_EC50 and
                sigma_top and (fit_EC50 - abs(sigma_EC50)) > 0):
            auce_vs_concentration_fig.add_trace(go.Scatter(
                x=[fit_EC50, fit_EC50],
                y=[0, fsigmoid(fit_EC50, *fitted_params)],
                line=dict(width=1, color=colors[index_class2], dash='dot'),
                mode='lines',
                hovertemplate=(
                    "EC50 : %f +/- %f<br><br>" % (fit_EC50, sigma_EC50) +
                    "<extra></extra>"),
                showlegend=False
            ))
            auce_vs_concentration_fig.add_trace(go.Scatter(
                x=x,
                y=y,
                name="FIT %s, %s" % (class2_selection, class2_selected),
                showlegend=True,
                visible=True,
                hovertemplate=(
                    "<b>Fit </b><br>" +
                    "Parameters :<br>" +
                    "Top : %f +/- %f<br> " % (fit_top, sigma_top) +
                    "Bottom : %f +/- %f<br>" % (fit_bottom, sigma_bottom) +
                    "EC50 : %f +/- %f<br><br>" % (fit_EC50, sigma_EC50) +
                    "X : %{x:}<br>" +
                    "Y: %{y:}<br>" +
                    "<extra></extra>"),
                mode="lines",
                line=dict(color=colors[index_class2])
            ))
            auce_vs_concentration_fig.add_trace(go.Scatter(
                x=x,
                y=y_upper,
                mode='lines',
                line=dict(width=0.3, color=colors[index_class2]),
                showlegend=False,
                hoverinfo='skip'
            ))
            auce_vs_concentration_fig.add_trace(go.Scatter(
                x=x,
                y=y_lower,
                line=dict(width=0.3, color=colors[index_class2]),
                mode='lines',
                showlegend=False,
                hoverinfo='skip'
            ))
            # auce_vs_concentration_fig.update_layout(
            #    autosize=True,
            #    xaxis_title='Concentration',
            #    yaxis_title='AUCE',
            #    template="plotly_white",
            # )
        else:
            auce_vs_concentration_fig.add_annotation(
                text=(
                    "Could not fit %s %s<br> " % (
                        class2_selection, class2_selected
                    )
                ),
                xref='paper', yref='paper',
                x=0.05, y=1 - index_class2 * 0.1,
                showarrow=False, font=dict(color=colors[index_class2])
            )
            
    return sigma_top, sigma_bottom, sigma_EC50