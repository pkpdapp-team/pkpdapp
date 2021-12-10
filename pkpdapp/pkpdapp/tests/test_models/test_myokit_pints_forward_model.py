#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.test import TestCase
from pkpdapp.models import (
    PharmacodynamicModel,
    MyokitForwardModel,
    PharmacokineticModel
)
import numpy as np


class TestObjectiveFunctionSerializer(TestCase):
    def setUp(self):
        m = PharmacodynamicModel.objects.get(
            name='tumour_growth_inhibition_model_koch',
        )
        self.model = m.get_myokit_model()
        self.simulator = m.get_myokit_simulator()

        self.parameter_dict = {
            'myokit.tumour_volume': 1,
            'myokit.lambda_0': 1,
            'myokit.lambda_1': 1,
            'myokit.kappa': 1,
            'myokit.drug_concentration': 1,
        }

        all_keys = list(self.parameter_dict.keys())
        self.fixed_dict = {
            'myokit.tumour_volume': 1,
            'myokit.lambda_0': 1,
            'myokit.drug_concentration': 1,
        }
        variable_keys = (
            [k for k in all_keys if k not in list(self.fixed_dict.keys())]
        )
        self.variable_parameter_values = [self.parameter_dict[v]
                                          for v in variable_keys]

    def test_run_myokit_pints_forward_model(self):
        times = np.linspace(0, 100)

        forward_model = MyokitForwardModel(
            myokit_model=self.model,
            myokit_simulator=self.simulator,
            fixed_parameter_dict=self.fixed_dict)

        z = forward_model.simulate(self.variable_parameter_values, times)
        self.assertEqual(len(z), len(times))

        # try without any fixed parameters
        forward_model = MyokitForwardModel(
            myokit_model=self.model,
            myokit_simulator=self.simulator)
        z1 = forward_model.simulate(list(self.parameter_dict.values()), times)
        self.assertTrue(np.array_equal(z, z1))

        # try model giving output name
        forward_model = MyokitForwardModel(
            myokit_model=self.model,
            myokit_simulator=self.simulator,
            outputs="myokit.tumour_volume")
        z2 = forward_model.simulate(list(self.parameter_dict.values()), times)
        self.assertTrue(np.array_equal(z2, z1))

        # try model with different variable parameters and check output differs
        new_fixed_dict = {
            'myokit.tumour_volume': 2,
            'myokit.lambda_0': 3,
            'myokit.drug_concentration': 7.5,
        }
        forward_model = MyokitForwardModel(
            myokit_model=self.model,
            myokit_simulator=self.simulator,
            fixed_parameter_dict=new_fixed_dict)
        z3 = forward_model.simulate(self.variable_parameter_values, times)
        self.assertTrue(not np.array_equal(z3, z))

        # check model with different parameter inputs gives different result
        self.variable_parameter_values[0] = 7
        forward_model = MyokitForwardModel(
            myokit_model=self.model,
            myokit_simulator=self.simulator,
            fixed_parameter_dict=new_fixed_dict)
        z4 = forward_model.simulate(self.variable_parameter_values, times)
        self.assertTrue(not np.array_equal(z4, z3))

    def test_multiple_output_model(self):
        m = PharmacokineticModel.objects.get(
            name='three_compartment_pk_model',
        )
        model = m.get_myokit_model()
        simulator = m.get_myokit_simulator()

        full_dict = {
            'central.size': 1,
            'peripheral_1.size': 1,
            'peripheral_2.size': 1,
            'myokit.clearance': 1,
            'myokit.k_peripheral1': 1,
            'myokit.k_peripheral2': 1,
            'central.drug_c_amount': 1,
            'peripheral_1.drug_p1_amount': 1,
            'peripheral_2.drug_p2_amount': 1
        }
        fixed_dict = {
            'peripheral_1.drug_p1_amount': 1,
            'peripheral_2.drug_p2_amount': 1
        }
        variable_parameters = [1, 1, 1, 1, 1, 1, 1]
        forward_model = MyokitForwardModel(
            myokit_model=model,
            myokit_simulator=simulator,
            fixed_parameter_dict=fixed_dict)

        times = np.linspace(0, 100)
        z = forward_model.simulate(variable_parameters, times)
        expected_shape = np.array((len(times), 3))
        self.assertTrue(np.array_equal(z.shape, expected_shape))

        # supply all three outputs explicitly
        desired_outputs = ['central.drug_c_amount',
                           'peripheral_1.drug_p1_amount',
                           'peripheral_2.drug_p2_amount']
        forward_model = MyokitForwardModel(
            myokit_model=model,
            myokit_simulator=simulator,
            fixed_parameter_dict=fixed_dict,
            outputs=desired_outputs)
        za = forward_model.simulate(variable_parameters, times)
        self.assertTrue(np.array_equal(z, za))

        # supply no fixed dictionary
        forward_model = MyokitForwardModel(
            myokit_model=model,
            myokit_simulator=simulator,
            outputs=desired_outputs)
        zb = forward_model.simulate([1] * 9, times)
        self.assertTrue(np.array_equal(z, zb))

        # only supply two outputs as expected outputs
        desired_outputs = ['central.drug_c_amount',
                           'peripheral_2.drug_p2_amount']
        forward_model = MyokitForwardModel(
            myokit_model=model,
            myokit_simulator=simulator,
            fixed_parameter_dict=fixed_dict,
            outputs=desired_outputs)
        z1 = forward_model.simulate(variable_parameters, times)
        expected_shape = np.array((len(times), 2))
        self.assertTrue(np.array_equal(z1.shape, expected_shape))
        self.assertTrue(np.array_equal(z[:, [0, 2]], z1))

        # supply two outputs other way around as expected outputs
        desired_outputs = ['peripheral_2.drug_p2_amount',
                           'central.drug_c_amount']
        forward_model = MyokitForwardModel(
            myokit_model=model,
            myokit_simulator=simulator,
            fixed_parameter_dict=fixed_dict,
            outputs=desired_outputs)
        z1a = forward_model.simulate(variable_parameters, times)
        expected_shape = np.array((len(times), 2))
        self.assertTrue(np.array_equal(z1a.shape, expected_shape))
        self.assertTrue(np.array_equal(z1a[:, [1, 0]], z1))

        # only supply a single output
        desired_outputs = 'peripheral_2.drug_p2_amount'
        forward_model = MyokitForwardModel(
            myokit_model=model,
            myokit_simulator=simulator,
            fixed_parameter_dict=fixed_dict,
            outputs=desired_outputs)
        z2 = forward_model.simulate(variable_parameters, times)
        self.assertEqual(len(z2), len(times))
        self.assertTrue(np.array_equal(z2, z[:, 2]))
