#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import dash_core_components as dcc
import dash_html_components as html
import dash_bootstrap_components as dbc
from dash.dependencies import Input, Output
import plotly.graph_objects as go
from .auce_figure import AuceFigure
import pandas as pd
import django_plotly_dash as dpd
import json

# Create data view
app = dpd.DjangoDash(
    name='auce_view',
    add_bootstrap_links=True
)

# Create dash app
app.layout = dbc.Container([
    dbc.Row(children=[
        dbc.Col(width=5, children=[
            html.Label("Select datasets to use:"),
            dcc.Dropdown(
                id='dataset-dropdown',
            ),
        ])
    ]),
    dbc.Row([
        dbc.Col(
            children=[
                html.P(children=(
                    'Note: AUCE app requries Dosing Groups corresponding to '
                    'numerical concentrations '
                )),
                dbc.Col(width=3, children=[
                    html.Label("Choose variable:"),
                    dcc.Dropdown(
                        id='auce-biomarker-dropdown',
                    ),
                ]),
                dcc.Graph(
                    id='initial-doses-dashboard',
                    figure=go.Figure(),
                    style={'width': '100%'}
                ),
                dcc.Graph(
                    id='auce-dashboard',
                    figure=go.Figure(),
                    style={'width': '100%'}
                )
            ],
        ),
    ]),
])


def rehydrate_state(session_state):
    if session_state is None:
        raise NotImplementedError("Cannot handle a missing session state")

    state = session_state.get('auce_view', None)

    if state is None:
        raise NotImplementedError('AuceState missing in session state')

    return AuceState.from_json(state)


@app.callback(
    [
        Output('dataset-dropdown', 'options'),
        Output('dataset-dropdown', 'value'),
    ],
    [Input('auce-dashboard', 'style')],
)
def update_datasets(_, session_state=None):
    state = rehydrate_state(session_state)
    return state._dataset_options, state._selected_dataset


@app.callback(
    [
        Output('auce-biomarker-dropdown', 'options'),
        Output('auce-biomarker-dropdown', 'value'),
    ],
    [
        Input('dataset-dropdown', 'value'),
    ]
)
def update_nca_auce_options(dataset_dropdown, session_state=None):
    state = rehydrate_state(session_state)
    state._selected_dataset = dataset_dropdown
    biomarkers = state._get_biomarkers()
    return biomarkers, biomarkers[0]['value']


@app.callback(
    [
        Output('initial-doses-dashboard', 'figure'),
        Output('auce-dashboard', 'figure'),
    ],
    [
        Input('auce-biomarker-dropdown', 'value'),
        Input('dataset-dropdown', 'value'),
    ],
)
def update_auce(auce_biomarker_dropdown, dataset_dropdown,
                session_state=None):
    state = rehydrate_state(session_state)
    state._selected_dataset = dataset_dropdown
    return state.generate_auce_figures(auce_biomarker_dropdown)


class AuceState:
    """
    """
    _id_key = 'ID'
    _biomarker_key = 'Biomarker'
    _compound_key = 'Compound'

    def __init__(self):
        self._selected_dataset = []
        self._datasets = []
        self._dataset_options = []
        self._auce_biomarker = None

    def add_datasets(self, datasets, dataset_names):
        # handle empty datasets
        if not datasets:
            return

        # by default show last datset
        self._selected_dataset = 0
        self._datasets = datasets
        for dataset, dataset_name in zip(self._datasets, dataset_names):
            dataset['Dataset'] = dataset_name
        self._dataset_options = [
            {'label': name, 'value': i} for i, name in enumerate(dataset_names)
        ]

        # by default use first biomarker
        self._auce_biomarker = self._datasets[
            self._selected_dataset
        ][self._biomarker_key][0]

    def to_json(self):
        state_dict = {
            '_selected_dataset': self._selected_dataset,
            '_datasets': [d.to_dict() for d in self._datasets],
            '_dataset_options': self._dataset_options,
            '_auce_biomarker': self._auce_biomarker,
        }
        return json.dumps(state_dict)

    @classmethod
    def from_json(cls, j):
        data_dict = json.loads(j)
        o = cls()
        o._selected_dataset = data_dict['_selected_dataset']
        o._datasets = [
            pd.DataFrame.from_dict(d) for d in data_dict['_datasets']
        ]

        o._dataset_options = data_dict['_dataset_options']
        o._auce_biomarker = data_dict['_auce_biomarker']
        return o

    def generate_auce_figures(self, new_biomarker=None):
        if not self._datasets:
            return go.Figure(), go.Figure()
        if new_biomarker:
            self._auce_biomarker = new_biomarker
        self._auce_figure = AuceFigure(
            self._datasets[self._selected_dataset],
            self._auce_biomarker
        )
        return self._auce_figure.figures()

    def _get_biomarkers(self):
        biomarkers = set()
        biomarkers = self._datasets[self._selected_dataset][
            self._biomarker_key
        ].unique().tolist()
        return [{'label': str(i), 'value': i} for i in biomarkers]
