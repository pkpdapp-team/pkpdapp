#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import unittest

import erlotinib as erlo
import plotly.graph_objects as go

from ..dash_apps.simulation import PDSimulationApp


class TestPDSimulationApp(unittest.TestCase):
    """
    Tests the PDSimulationApp.

    Note that the methods are only tested superficially as most functionality
    cannot be tested well in a unit testing framework.
    """

    @classmethod
    def setUpClass(cls):
        # Define test app
        cls.app = PDSimulationApp(name='Test')

    def test_add_data(self):
        # Add data and check that it doesn't break
        # This is just a wrapper around erlotinibs figure class, which is
        # thoroughly tested.
        data = erlo.DataLibrary().lung_cancer_control_group()
        self.app.add_data(data, biomarker='Tumour volume')

    def test_add_model(self):
        # Add model and check that it doesn't break
        path = erlo.ModelLibrary().tumour_growth_inhibition_model_koch()
        model = erlo.PharmacodynamicModel(path)
        model.set_parameter_names(names={
            'myokit.drug_concentration': 'Drug concentration in mg/L',
            'myokit.tumour_volume': 'Tumour volume in cm^3',
            'myokit.kappa': 'Potency in L/mg/day',
            'myokit.lambda_0': 'Exponential growth rate in 1/day',
            'myokit.lambda_1': 'Linear growth rate in cm^3/day'})
        self.app.add_model(model)

    def test_add_model_bad_input(self):
        # Model has wrong type
        model = 'Bad type'
        app = PDSimulationApp(name='Test')
        with self.assertRaisesRegex(TypeError, 'Model has to be an instance'):
            app.add_model(model)

        # Model names contain dots, e.g. myokit.tumour_volume
        path = erlo.ModelLibrary().tumour_growth_inhibition_model_koch()
        model = erlo.PharmacodynamicModel(path)
        with self.assertRaisesRegex(ValueError, 'Dots cannot be in the param'):
            app.add_model(model)

        # Model has been set previously
        model.set_parameter_names(names={
            'myokit.drug_concentration': 'Drug concentration in mg/L',
            'myokit.tumour_volume': 'Tumour volume in cm^3',
            'myokit.kappa': 'Potency in L/mg/day',
            'myokit.lambda_0': 'Exponential growth rate in 1/day',
            'myokit.lambda_1': 'Linear growth rate in cm^3/day'})
        app.add_model(model)

        with self.assertRaisesRegex(ValueError, 'A model has been set'):
            app.add_model(model)

    def test_slider_ids(self):
        slider_ids = self.app.slider_ids()

        self.assertEqual(len(slider_ids), 5)
        self.assertEqual(slider_ids[0], 'Tumour volume in cm^3')
        self.assertEqual(slider_ids[1], 'Drug concentration in mg/L')
        self.assertEqual(slider_ids[2], 'Potency in L/mg/day')
        self.assertEqual(slider_ids[3], 'Exponential growth rate in 1/day')
        self.assertEqual(slider_ids[4], 'Linear growth rate in cm^3/day')

    def test_update_simulation(self):
        # This callback falls out of the realm of unit testing. So we just
        # check that a figure is returned.
        parameters = [1, 1, 1, 1, 1]
        fig = self.app.update_simulation(parameters)

        self.assertIsInstance(fig, go.Figure)
