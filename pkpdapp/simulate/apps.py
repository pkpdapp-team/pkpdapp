#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.apps import AppConfig
from dash.dependencies import Input, Output
import erlotinib as erlo

from .dash_apps.simulation import PDSimulationApp


class SimulateConfig(AppConfig):
    name = 'simulate'

