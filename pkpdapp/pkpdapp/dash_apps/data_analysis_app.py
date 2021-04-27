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
from .auce_figure import AuceFigure
import pandas as pd
import dash
import django_plotly_dash as dpd
import json

# Create data view
app = dpd.DjangoDash(
    name='data_analysis_view',
    add_bootstrap_links=True
)

# Create dash app
app.layout = dbc.Container([
    dbc.Row(children=[
        dbc.Col(width=5, children=[
            html.Label("Select datasets to use:"),
            dcc.Dropdown(
                id='dataset-dropdown',
                multi=True,
            ),
        ])
    ]),
    dbc.Row([dbc.Col([
        dcc.Tabs(id='data-analysis-tabs', value='nca-tab', children=[
            dcc.Tab(
                label='Non-compartmental Analysis', value='nca-tab',
                children=[
                    html.P(children=(
                        'Note: NCA app assumes that the datasets '
                        'chosen have a single dose occuring at time 0'
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
                        style={'height': '100%'}
                    )
                ],
            ),
            dcc.Tab(
                label='AUCE', value='initial-doses-tab',
                children=[
                    html.P(children=(
                        'Note: AUCE app assumes that the datasets '
                        'chosen have a single continuous dose '
                        'starting at time 0 and continuing for the '
                        'entire duration'
                    )),
                    dbc.Col(width=3, children=[
                        html.Label("Choose biomarkers:"),
                        dcc.Dropdown(
                            id='auce-biomarker-dropdown',
                        ),
                    ]),
                    dcc.Graph(
                        id='initial-doses-dashboard',
                        figure=go.Figure(),
                        style={'height': '100%'}
                    ),
                    dcc.Graph(
                        id='auce-dashboard',
                        figure=go.Figure(),
                        style={'height': '100%'}
                    )
                ],
            ),
        ]),
    ])])
])


def rehydrate_state(session_state):
    if session_state is None:
        raise NotImplementedError("Cannot handle a missing session state")

    state = session_state.get('data_analysis_view', None)

    if state is None:
        raise NotImplementedError('DataAnalysisState missing in session state')

    return DataAnalysisState.from_json(state)


@app.callback(
    [
        Output('dataset-dropdown', 'options'),
        Output('dataset-dropdown', 'value'),
    ],
    [Input('nca-subject-dropdown', 'style')],
)
def update_datasets(_, session_state=None):
    state = rehydrate_state(session_state)
    return state._dataset_options, state._selected_datasets


@app.callback(
    [
        Output('nca-subject-dropdown', 'options'),
        Output('nca-subject-dropdown', 'value'),
        Output('auce-biomarker-dropdown', 'options'),
        Output('auce-biomarker-dropdown', 'value'),
    ],
    [
        Input('dataset-dropdown', 'value'),
    ]
)
def update_nca_auce_options(dataset_dropdown, session_state=None):
    state = rehydrate_state(session_state)
    state._selected_datasets = dataset_dropdown
    state._merged_datasets = state.merge_datasets(
        state._selected_datasets
    )
    subject_ids = state._get_subject_ids()
    biomarkers = state._get_biomarkers()
    return subject_ids, subject_ids[0], biomarkers, biomarkers[0]


@app.callback(
    Output('nca-dashboard', 'figure'),
    [
        Input('nca-subject-dropdown', 'value'),
        Input('dataset-dropdown', 'value'),
    ],
)
def update_nca(nca_subject_dropdown, dataset_dropdown,
               session_state=None):
    state = rehydrate_state(session_state)
    ctx = dash.callback_context
    if not ctx.triggered:
        triggered_id = 'Nothing'
    else:
        triggered_id = ctx.triggered[0]['prop_id'].split('.')[0]
    if triggered_id == 'nca-subject-dropdown':
        return state.generate_nca_figure(nca_subject_dropdown)
    elif triggered_id == 'dataset-dropdown' and \
            dataset_dropdown != state._selected_datasets:
        state._selected_datasets = dataset_dropdown
        state._merged_datasets = state.merge_datasets(
            state._selected_datasets
        )
        return state.generate_nca_figure()
    else:
        return state.generate_nca_figure()


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
    ctx = dash.callback_context
    if not ctx.triggered:
        triggered_id = 'Nothing'
    else:
        triggered_id = ctx.triggered[0]['prop_id'].split('.')[0]
    if triggered_id == 'auce-biomarker-dropdown':
        return state.generate_auce_figures(auce_biomarker_dropdown)
    elif triggered_id == 'dataset-dropdown' and \
            dataset_dropdown != state._selected_datasets:
        state._selected_datasets = dataset_dropdown
        state._merged_datasets = state.merge_datasets(
            state._selected_datasets
        )
        return state.generate_auce_figures()
    else:
        return state.generate_auce_figures()


class DataAnalysisState:
    """
    """
    _id_key = 'ID'
    _biomarker_key = 'Biomarker'
    _compound_key = 'Compound'

    def __init__(self):
        self._selected_datasets = []
        self._datasets = []
        self._dataset_options = []
        self._nca_subject_id = None
        self._auce_biomarker = None
        self._merged_datasets = None

    def add_datasets(self, datasets, dataset_names):
        # handle empty datasets
        if not datasets:
            return

        # by default show first datset only
        self._selected_datasets = [0]
        self._datasets = datasets
        for dataset, dataset_name in zip(self._datasets, dataset_names):
            dataset['Dataset'] = dataset_name
        self._merged_datasets = self.merge_datasets(
            self._selected_datasets
        )
        self._dataset_options = [
            {'label': name, 'value': i} for i, name in enumerate(dataset_names)
        ]

        # by default use first subject and biomarker
        self._nca_subject_id = self._merged_datasets[self._id_key][0]
        self._auce_biomarker = self._merged_datasets[self._biomarker_key][0]

    def to_json(self):
        state_dict = {
            '_selected_datasets': self._selected_datasets,
            '_datasets': [d.to_dict() for d in self._datasets],
            '_dataset_options': self._dataset_options,
            '_nca_subject_id': self._nca_subject_id,
            '_auce_biomarker': self._auce_biomarker,
        }
        if isinstance(self._merged_datasets, pd.DataFrame):
            state_dict.update({
                '_merged_datasets': self._merged_datasets.to_dict()
            })
        else:
            state_dict.update({
                '_merged_datasets': self._merged_datasets
            })

        return json.dumps(state_dict)

    @classmethod
    def from_json(cls, j):
        data_dict = json.loads(j)
        o = cls()
        o._selected_datasets = data_dict['_selected_datasets']
        o._datasets = [
            pd.DataFrame.from_dict(d) for d in data_dict['_datasets']
        ]
        if isinstance(data_dict['_merged_datasets'], dict):
            o._merged_datasets = pd.DataFrame.from_dict(
                data_dict['_merged_datasets']
            )
        else:
            o._merged_datasets = data_dict['_merged_datasets']

        o._dataset_options = data_dict['_dataset_options']
        o._nca_subject_id = data_dict['_nca_subject_id']
        o._auce_biomarker = data_dict['_auce_biomarker']
        return o

    def generate_nca_figure(self, new_subject_id=None):
        if self._merged_datasets is None:
            return go.Figure()
        if new_subject_id:
            self._nca_subject_id = new_subject_id
        self._nca_figure = NcaFigure(
            self._merged_datasets,
            self._nca_subject_id
        )
        return self._nca_figure.figure()

    def generate_auce_figures(self, new_biomarker=None):
        if self._merged_datasets is None:
            return go.Figure(), go.Figure()
        if new_biomarker:
            self._auce_biomarker = new_biomarker
        self._auce_figure = AuceFigure(
            self._merged_datasets,
            self._auce_biomarker
        )
        return self._auce_figure.figures()

    def merge_datasets(self, datasets):
        if not datasets:
            return None
        else:
            return pd.concat([
                self._datasets[i] for i in datasets
            ])

    def is_valid_nca_subject(self, id):
        df = self._merged_datasets
        drug_measurements = df.loc[
            (df[self._id_key] == id) &
            (df[self._biomarker_key] == df[self._compound_key])
        ]
        return len(drug_measurements.index) > 0

    def _get_subject_ids(self):
        ids = set()
        ids = self._merged_datasets[self._id_key].unique().tolist()
        return [
            {'label': str(i), 'value': i}
            for i in ids if self.is_valid_nca_subject(i)
        ]

    def _get_biomarkers(self):
        biomarkers = set()
        biomarkers = self._merged_datasets[
            self._biomarker_key
        ].unique().tolist()
        return [{'label': str(i), 'value': i} for i in biomarkers]
