#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import dash_bootstrap_components as dbc
import dash_core_components as dcc
import dash_html_components as html
import pkpdapp.erlotinib as erlo
import plotly.graph_objects as go
import django_plotly_dash as dpd
import pandas as pd
from dash.dependencies import Input, Output
import dash
import json


# Create data view
app = dpd.DjangoDash(
    name='data_view_app',
    add_bootstrap_links=True
)

app.layout = dbc.Container(children=[
    dbc.Row([
        dbc.Col(
            children=[
                html.Label('Variable:'),
                dcc.Dropdown(
                    id='biomarker-select',
                )
            ],
            width=3,
        ),
    ]),
    dbc.Row([
        dbc.Col(
            children=[
                dcc.Graph(
                    figure=go.Figure(),
                    id='fig',
                    style={'height': '550px'}
                )
            ],
        )
    ])
], fluid=True, style={'height': '90vh'})


def rehydrate_state(session_state):
    if session_state is None:
        raise NotImplementedError("Cannot handle a missing session state")

    state = session_state.get('data_view', None)

    if state is None:
        raise NotImplementedError('DataViewState missing in session state')

    return DataViewState.from_json(state)


@app.callback(
    [
        Output('biomarker-select', 'options'),
        Output('biomarker-select', 'value'),
    ],
    [
        Input('fig', 'style'),
    ])
def update_biomarker_options(_, session_state=None):
    state = rehydrate_state(session_state)
    options = state.biomarker_dropdown_options()
    return options, state._use_biomarkers


@app.callback(
    Output('fig', 'figure'),
    [
        Input('biomarker-select', 'value'),
    ])
def update_figure(biomarker, session_state=None):
    """
    if the datasets or biomarkers are
    changed then regenerate the figure entirely
    """
    state = rehydrate_state(session_state)

    ctx = dash.callback_context
    cid = None
    if ctx.triggered:
        cid = ctx.triggered[0]['prop_id'].split('.')[0]

    if cid == 'biomarker-select':
        state.set_used_biomarker(biomarker)

    return state.create_figure()


class DataViewState:
    """
    State class for data view app
    """
    _id_key = 'ID'
    _time_key = 'Time'
    _biom_key = 'Biomarker'
    _meas_key = 'Measurement'

    def __init__(self):
        # Create defaults
        self._datasets = []
        self._use_datasets = []
        self._dataset_names = []
        self._data_biomarkers = []
        self._use_biomarkers = None

    def to_json(self):
        return json.dumps({
            '_datasets': [d.to_dict() for d in self._datasets],
            '_use_datasets': self._use_datasets,
            '_dataset_names': self._dataset_names,
            '_data_biomarkers': self._data_biomarkers,
            '_use_biomarkers': self._use_biomarkers,
        })

    @classmethod
    def from_json(cls, j):
        data_dict = json.loads(j)
        o = cls()
        o._datasets = [
            pd.DataFrame.from_dict(d) for d in data_dict['_datasets']
        ]
        o._use_datasets = data_dict['_use_datasets']
        o._dataset_names = data_dict['_dataset_names']
        o._data_biomarkers = data_dict['_data_biomarkers']
        o._use_biomarkers = data_dict['_use_biomarkers']
        return o

    def set_used_datasets(self, value):
        """
        set dataset indices that will be used
        """
        self._use_datasets = value

    def set_used_biomarker(self, value):
        """
        set biomarker that will be used
        """
        self._use_biomarkers = value

    def dataset_dropdown_options(self):
        """
        create selects for model, dataset and biomarkers up the top of the dash
        app
        """
        return [
            {
                'label': name,
                'value': i
            } for i, name in enumerate(self._dataset_names)
        ]

    def biomarker_dropdown_options(self):
        return [
            {
                'label': '{} ({})'.format(name, unit),
                'value': name
            } for name, unit in
            self._data_biomarkers[self._use_datasets[0]].items()
        ]

    def create_figure(self):
        """
        returns the main figure
        """
        fig = erlo.plots.PDTimeSeriesPlot(updatemenu=False)
        self._add_data_to_fig(fig)
        return fig._fig

    def _add_data_to_fig(self, fig):
        """
        add chosen datasets to figure
        """
        used_datasets = [
            d for i, d in enumerate(self._datasets) if i in self._use_datasets
        ]

        if not used_datasets:
            return

        combined_data = pd.concat(used_datasets)

        biomarker = self._use_biomarkers

        if biomarker is not None:
            # Add data to figure,
            # ignore error if biomarker does not exist
            try:
                fig.add_data(combined_data, biomarker, self._id_key,
                             self._time_key, self._biom_key,
                             self._meas_key)
            except ValueError:
                pass

        # Set axes labels to time_key and biom_key
        fig.set_axis_labels(xlabel='Time (h)', ylabel=self._biom_key)
        fig._fig.update_layout(
            yaxis=dict(
                exponentformat='e'
            ),
        )

    def add_data(self, data, name, biomarkers, use=False):
        """
        Adds pharmacodynamic time series data of (multiple) individuals to
        the figure.

        Expects a :class:`pandas.DataFrame` with an ID, a time and a PD
        biomarker column, and adds a scatter plot of the biomarker time series
        to the figure. Each individual receives a unique colour.

        Parameters
        ----------
        data
            A :class:`pandas.DataFrame` with the time series PD data in form of
            an ID, time, and biomarker column.
        name
            A str name for the dataset
        biomarkers
            dict with {biomarker: unit}
        use
            Set to True if you want this dataset to be initially chosen
        """
        if use:
            self._use_datasets.append(len(self._datasets))
        self._datasets.append(data)
        self._dataset_names.append(name)

        self._data_biomarkers.append(biomarkers)
        if self._use_biomarkers is None:
            self._use_biomarkers = next(iter(biomarkers.keys()))
