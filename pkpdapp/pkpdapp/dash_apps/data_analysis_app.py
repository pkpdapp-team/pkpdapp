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
from .nca import NCA
from .nca_figure import NcaFigure
from .auce_figure import AuceFigure
import pandas as pd


class DataAnalysisApp(BaseApp):
    """
    """

    def __init__(self, name, data_meas, data_dose):
        super(DataAnalysisApp, self).__init__(name)

        id_key = 'ID'
        time_key = 'Time'
        nca_subject_id = 5335

        print('DATA DOSE is')
        print(data_dose)

        # assume that we have single dose data, with the initial dose given in data_dose
        # with the smallest time
        initial_doses = data_dose.sort_values(by=time_key)\
                                 .groupby([id_key])\
                                 .first()\
                                 .drop(columns=time_key)

        print('INITIAL DOSE is')
        print(initial_doses)

        dataset = pd.merge(
            data_meas, initial_doses,
            how='inner', on=[id_key]
        )
        print('DATASET is')
        print(dataset)

        self._nca_figure = NcaFigure(dataset, nca_subject_id)
        self._auce_figure = AuceFigure(dataset)

        self.set_layout()


    def set_layout(self):
        # Create dash app
        self.app.layout = html.Div([
            dcc.Tabs(id='data-analysis-tabs', value='nca-tab', children=[
                dcc.Tab(
                    label='NCA', value='nca-tab',
                    children=[
                        dcc.Graph(
                            id='nca-dashboard',
                            figure=self._nca_figure.figure(),
                            style={'height': '100%'}
                        )
                    ],
                ),
                dcc.Tab(
                    label='AUCE', value='auce-tab',
                    children=[
                        dcc.Graph(
                            id='auce-dashboard',
                            figure=self._auce_figure.figures()[0],
                            style={'height': '100%'}
                        )
                    ],
                ),
            ]),
        ])
