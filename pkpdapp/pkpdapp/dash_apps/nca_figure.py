


class NCAFigure():
    """
    """

    def __init__(self, data_meas, data_dose, subject_id):

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
        self._process_nca(data_meas, self._dose_amount)
        self._fig = self._create_nca_figure()
        self.set_layout()

    def figure(self):
        return self._fig

    def _process_nca(self, df, dose_amount):
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

    def _create_nca_figure(self):
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

