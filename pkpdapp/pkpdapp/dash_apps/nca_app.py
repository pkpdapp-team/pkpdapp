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
from .nca_figure import NcaFigure
import pandas as pd
import dash
import django_plotly_dash as dpd
import json

# Create data view
app = dpd.DjangoDash(
    name='nca_view',
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
                    'Note: NCA app assumes that the datasets '
                    'chosen have a single dose occuring at time 0.'
                    ' Only datasets with dosing protocols will be shown.'
                )),
                dbc.Col(width=3, children=[
                    html.Label("Choose subject id:"),
                    dcc.Dropdown(
                        id='nca-subject-dropdown',
                    ),
                ]),
                dcc.Graph(
                    id='nca-dashboard',
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

    state = session_state.get('nca_view', None)

    if state is None:
        raise NotImplementedError('NcaState missing in session state')

    return NcaState.from_json(state)


@app.callback(
    [
        Output('dataset-dropdown', 'options'),
        Output('dataset-dropdown', 'value'),
    ],
    [Input('nca-subject-dropdown', 'style')],
)
def update_datasets(_, session_state=None):
    print('update_datasets')
    state = rehydrate_state(session_state)
    return state._dataset_options, state._selected_dataset


@app.callback(
    [
        Output('nca-subject-dropdown', 'options'),
        Output('nca-subject-dropdown', 'value'),
    ],
    [
        Input('dataset-dropdown', 'value'),
    ]
)
def update_nca_auce_options(dataset_dropdown, session_state=None):
    print('update_nca_options')
    state = rehydrate_state(session_state)
    state._selected_dataset = dataset_dropdown
    subject_ids = state._get_subject_ids()
    return subject_ids, subject_ids[0]


@app.callback(
    Output('nca-dashboard', 'figure'),
    [
        Input('nca-subject-dropdown', 'value'),
        Input('dataset-dropdown', 'value'),
    ],
)
def update_nca(nca_subject_dropdown, dataset_dropdown,
               session_state=None):
    print('update_nca')
    state = rehydrate_state(session_state)
    ctx = dash.callback_context
    if not ctx.triggered:
        triggered_id = 'Nothing'
    else:
        triggered_id = ctx.triggered[0]['prop_id'].split('.')[0]
    if triggered_id == 'nca-subject-dropdown':
        return state.generate_nca_figure(nca_subject_dropdown)
    elif triggered_id == 'dataset-dropdown' and \
            dataset_dropdown != state._selected_dataset:
        state._selected_dataset = dataset_dropdown
        return state.generate_nca_figure()
    else:
        return state.generate_nca_figure()


class NcaState:
    """
    """
    _id_key = 'ID'
    _biomarker_key = 'Biomarker'
    _compound_key = 'Compound'

    def __init__(self):
        self._selected_dataset = []
        self._datasets = []
        self._dataset_options = []
        self._nca_subject_id = None

    def add_datasets(self, datasets, dataset_names):
        # handle empty datasets
        if not datasets:
            return

        # by default show first datset only
        self._selected_dataset = 0
        self._datasets = datasets
        for dataset, dataset_name in zip(self._datasets, dataset_names):
            dataset['Dataset'] = dataset_name
        self._dataset_options = [
            {'label': name, 'value': i} for i, name in enumerate(dataset_names)
        ]

        # by default use first subject and biomarker
        self._nca_subject_id = self._datasets[
            self._selected_dataset
        ][self._id_key][0]

    def to_json(self):
        state_dict = {
            '_selected_dataset': self._selected_dataset,
            '_datasets': [d.to_dict() for d in self._datasets],
            '_dataset_options': self._dataset_options,
            '_nca_subject_id': self._nca_subject_id,
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
        o._nca_subject_id = data_dict['_nca_subject_id']
        return o

    def generate_nca_figure(self, new_subject_id=None):
        if not self._datasets:
            return go.Figure()
        if new_subject_id:
            self._nca_subject_id = new_subject_id
        self._nca_figure = NcaFigure(
            self._datasets[self._selected_dataset],
            self._nca_subject_id
        )
        return self._nca_figure.figure()

    def is_valid_nca_subject(self, id):
        df = self._datasets[self._selected_dataset]
        drug_measurements = df.loc[
            (df[self._id_key] == id) &
            (df[self._biomarker_key] == df[self._compound_key])
        ]
        return len(drug_measurements.index) > 0

    def _get_subject_ids(self):
        ids = set()
        ids = self._datasets[
            self._selected_dataset
        ][self._id_key].unique().tolist()
        return [
            {'label': str(i), 'value': i}
            for i in ids if self.is_valid_nca_subject(i)
        ]
