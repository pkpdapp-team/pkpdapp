#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import dash_core_components as dcc
import dash_html_components as html
import dash_bootstrap_components as dbc
import numpy as np
from dash.dependencies import Input, Output
import plotly.express as px
import plotly.graph_objects as go
import scipy.stats as stats
from .base import BaseApp
from .nca import NCA
from .nca_figure import NcaFigure
from .auce_figure import AuceFigure
import pandas as pd
import dash


class DataAnalysisApp(BaseApp):
    """
    """
    _id_key = 'ID'
    _biomarker_key = 'Biomarker'
    _compound_key = 'Compound'

    def __init__(self, name, datasets, dataset_names):
        super(DataAnalysisApp, self).__init__(name)

        self._selected_datasets = [0]
        self._datasets = datasets
        for d, name in zip(self._datasets, dataset_names):
            d['Dataset'] = name
        self.merge_datasets(self._selected_datasets)
        self._dataset_options = [
            {'label': name, 'value': i} for i, name in enumerate(dataset_names)
        ]
        self._nca_subject_id = self._merged_datasets[self._id_key][0]
        self._auce_biomarker = self._merged_datasets[self._biomarker_key][0]
        self.set_layout()
        self.set_callbacks()

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
            self._merged_datasets = None
        else:
            self._merged_datasets = pd.concat([
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
        return [{'label': str(i), 'value':i} for i in ids if self.is_valid_nca_subject(i)]

    def _get_biomarkers(self):
        biomarkers = set()
        biomarkers = self._merged_datasets[self._biomarker_key].unique().tolist()
        return [{'label': str(i), 'value':i} for i in biomarkers]

    def set_callbacks(self):
        @self.app.callback(
            Output('nca-dashboard', 'figure'),
            [
                Input('nca-subject-dropdown', 'value'),
                Input('dataset-dropdown', 'value'),
            ],
        )
        def update_nca(nca_subject_dropdown, dataset_dropdown):
            ctx = dash.callback_context
            if not ctx.triggered:
                triggered_id = 'Nothing'
            else:
                triggered_id = ctx.triggered[0]['prop_id'].split('.')[0]
            if triggered_id == 'nca-subject-dropdown':
                return self.generate_nca_figure(nca_subject_dropdown)
            elif triggered_id == 'dataset-dropdown' and \
                    dataset_dropdown != self._selected_datasets:
                self._selected_datasets = dataset_dropdown
                self.merge_datasets(self._selected_datasets)
                return self.generate_nca_figure()
            else:
                return self.generate_nca_figure()

        @self.app.callback(
            [
                Output('initial-doses-dashboard', 'figure'),
                Output('auce-dashboard', 'figure'),
            ],
            [
                Input('auce-biomarker-dropdown', 'value'),
                Input('dataset-dropdown', 'value'),
            ],
        )
        def update_nca(auce_biomarker_dropdown, dataset_dropdown):
            ctx = dash.callback_context
            if not ctx.triggered:
                triggered_id = 'Nothing'
            else:
                triggered_id = ctx.triggered[0]['prop_id'].split('.')[0]
            if triggered_id == 'auce-biomarker-dropdown':
                return self.generate_auce_figures(auce_biomarker_dropdown)
            elif triggered_id == 'dataset-dropdown' and \
                    dataset_dropdown != self._selected_datasets:
                self._selected_datasets = dataset_dropdown
                self.merge_datasets(self._selected_datasets)
                return self.generate_auce_figures()
            else:
                return self.generate_auce_figures()



    def set_layout(self):
        nca_figure = self.generate_nca_figure()
        auce_figures = self.generate_auce_figures()
        # Create dash app
        self.app.layout = dbc.Container([
            dbc.Row(children=[
                dbc.Col(width=5, children=[
                    html.Label("Select datasets to use:"),
                    dcc.Dropdown(
                        id='dataset-dropdown',
                        options=self._dataset_options,
                        value=self._selected_datasets,
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
                            'Note: NCA app assumes that the datasets chosen '
                            'have a single dose occuring at time 0'
                        )),
                        dbc.Col(width=3, children=[
                            html.Label("Choose subject id:"),
                            dcc.Dropdown(
                                id='nca-subject-dropdown',
                                options=self._get_subject_ids(),
                                value=self._nca_subject_id,
                            ),
                        ]),
                        dcc.Graph(
                            id='nca-dashboard',
                            figure=nca_figure,
                            style={'height': '100%'}
                        )
                    ],
                ),
                dcc.Tab(
                    label='AUCE', value='initial-doses-tab',
                    children=[
                        html.P(children=(
                            'Note: AUCE app assumes that the datasets chosen '
                            'have a single continuous dose starting at time 0 '
                            'and continuing for the entire duration'
                        )),
                        dbc.Col(width=3, children=[
                            html.Label("Choose biomarkers:"),
                            dcc.Dropdown(
                                id='auce-biomarker-dropdown',
                                options=self._get_biomarkers(),
                                value=self._auce_biomarker,
                            ),
                        ]),
                        dcc.Graph(
                            id='initial-doses-dashboard',
                            figure=auce_figures[0],
                            style={'height': '100%'}
                        ),
                        dcc.Graph(
                            id='auce-dashboard',
                            figure=auce_figures[1],
                            style={'height': '100%'}
                        )
                    ],
                ),
            ]),
            ])])
        ])
