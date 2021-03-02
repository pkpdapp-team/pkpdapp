#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import unittest

import pkpdapp.erlotinib as erlo
import plotly.graph_objects as go
import dash_bootstrap_components as dbc
from pkpdapp.models import (
    PharmacodynamicModel
)
import pandas as pd
import codecs
import urllib.request

from pkpdapp.dash_apps.simulation import PDSimulationApp


class TestPDSimulationApp(unittest.TestCase):
    """
    Tests the PDSimulationApp.

    Note that the methods are only tested superficially as most functionality
    cannot be tested well in a unit testing framework.
    """

    def setUp(self):
        sbml_url = 'https://raw.githubusercontent.com/pkpdapp-team/pkpdapp-datafiles/main/models/tgi_Koch_2009.xml'  # noqa: E501
        with urllib.request.urlopen(sbml_url) as f:
            # parse as csv file
            sbml_string = codecs.decode(f.read(), 'utf-8')
            self.m = PharmacodynamicModel(
                name='test',
                description='test',
                sbml=sbml_string
            )

    def util_new_app(self):
        return PDSimulationApp(name='Test')

    def util_add_model(self, app, use=True, replace_dots=True):
        m = self.m
        sbml_str = m.sbml.encode('utf-8')
        erlo_m = erlo.PharmacodynamicModel(sbml_str)
        if replace_dots:
            param_names = erlo_m.parameters()
            param_names_dict = {}
            for p in param_names:
                param_names_dict[p] = p.replace('.', '_')
            erlo_m.set_parameter_names(names=param_names_dict)
        app.add_model(erlo_m, m.name, use=use)
        return erlo_m.parameters()

    def util_add_dataset(self, app, use=True):
        data = {
            'ID': [1],
            'time': [0.0],
            'Biomarker': ['test'],
            'value': [1.0],
        }

        df = pd.DataFrame(data)

        app.add_data(df, 'test', use=use)

    def test_setters(self):
        app = self.util_new_app()
        app.set_used_models(1)
        self.assertEqual(app._use_models, 1)
        app.set_used_datasets(1)
        self.assertEqual(app._use_datasets, 1)
        app.set_used_biomarker(1)
        self.assertEqual(app._use_biomarkers, 1)

    def create_figure(self):
        f = self.app.create_figure()
        self.assertIsInstance(f.children[0], dbc.Graph)

    def test_set_sliders_disabled(self):
        app = self.util_new_app()
        app.set_layout()
        t = app.set_slider_disabled()
        self.assertFalse(t)
        self.util_add_model(app)
        app.set_layout()
        t = app.set_slider_disabled()
        self.assertEqual(len(t), 1)
        self.assertIsInstance(t[0], dbc.Tab)

    def test_add_data(self):
        app = self.util_new_app()
        self.assertFalse(app._use_datasets)
        self.util_add_dataset(app, use=True)
        self.assertEqual(len(app._use_datasets), 1)
        self.assertEqual(len(app._datasets), 1)
        self.util_add_dataset(app, use=False)
        self.assertEqual(len(app._use_datasets), 1)
        self.assertEqual(len(app._datasets), 2)

    def test_add_model(self):
        app = self.util_new_app()
        self.assertFalse(app._use_models)
        self.util_add_model(app, use=True)
        self.assertEqual(len(app._use_models), 1)
        self.assertEqual(len(app._models), 1)
        self.util_add_model(app, use=False)
        self.assertEqual(len(app._use_models), 1)
        self.assertEqual(len(app._models), 2)

    def test_add_model_bad_input(self):
        # Model has wrong type
        model = 'Bad type'
        app = PDSimulationApp(name='Test')
        with self.assertRaisesRegex(TypeError, 'Model has to be an instance'):
            app.add_model(model, name='test')

        # Model names contain dots, e.g. myokit.tumour_volume
        with self.assertRaisesRegex(ValueError, 'Dots cannot be in the param'):
            self.util_add_model(app, replace_dots=False)

    def test_slider_ids(self):
        app = self.util_new_app()
        params = self.util_add_model(app)
        app.set_layout()
        slider_ids = app.slider_ids()

        self.assertEqual(len(slider_ids), 1)
        self.assertEqual(len(slider_ids[0]), len(params))

    def test_update_simulation(self):
        app = self.util_new_app()
        params = self.util_add_model(app)
        app.set_layout()
        parameters = [1] * len(params)
        fig = app.update_simulation(0, parameters)
        self.assertIsInstance(fig, go.Figure)

    def test_set_layout(self):
        app = self.util_new_app()

        # test it runs with no model or dataset
        app.set_layout()

        # test it runs with a dataset but no model
        self.util_add_dataset(app)
        app.set_layout()

        # test it runs with both dataset and model
        self.util_add_model(app)
        app.set_layout()

        # add a model that won't be used
        self.util_add_model(app, use=False)
        app.set_layout()

        # change biomarker to one that doesn't exist
        app._use_biomarkers = 'nope'
        app.set_layout()
