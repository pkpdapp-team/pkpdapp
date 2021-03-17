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
from .nca_figure import NCAFigure
from .auce_figure import AUCEFigure


class DataAnalysisApp(BaseApp):
    """
    """

    def __init__(self, name, data_meas, data_dose, subject_id):
        super(DataAnalysisApp, self).__init__(name)

        self._nca_figure = NCAFigure(data_meas, data_dose, subject_id)
        self._auce_figure = AUCEFigure(data_meas, data_dose, subject_id)


    def set_layout(self):
        # Create dash app
        self.app.layout = html.Div(
            children=[
                dcc.Graph(
                    id='nca-dashboard',
                    figure=self._nca_figure.figure(),
                    style={'height': '100%'}
                )
            ],
        )
