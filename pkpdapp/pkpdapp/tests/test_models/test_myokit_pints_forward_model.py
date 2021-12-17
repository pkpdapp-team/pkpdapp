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


class TestMyokitPintsForwardModelSingleOutput(TestCase):
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

    def test_values(self):
        times = np.linspace(0, 100)

        forward_model = MyokitForwardModel(
            myokit_model=self.model,
            myokit_simulator=self.simulator)
        #['myokit.tumour_volume', 'myokit.drug_concentration', 'myokit.kappa', 'myokit.lambda_0', 'myokit.lambda_1']
        z = forward_model.simulate([1, 1, 1, 1, 1], times)
        self.assertTrue(np.abs(z[-1] - 0.4999996148976773) < 0.01)

        tumour_volume = 2
        z = forward_model.simulate([tumour_volume, 1, 1, 1, 1], times)
        self.assertTrue(np.abs(z[0] - tumour_volume) < 0.01)

        z = forward_model.simulate([tumour_volume, 2, 1, 1, 1], times)
        self.assertTrue(np.abs(z[-1] - 0.0025839360953396786) < 0.01)

        z = forward_model.simulate([tumour_volume, 2, 0.1, 1, 1], times)
        self.assertTrue(np.abs(z[-1] - 4.499969613738243) < 0.01)

        # add some fixed parameters
        forward_model = MyokitForwardModel(
            myokit_model=self.model,
            myokit_simulator=self.simulator,
            fixed_parameter_dict={'myokit.tumour_volume': 2})
        z = forward_model.simulate([2, 0.1, 1, 1], times)
        self.assertTrue(np.abs(z[-1] - 4.499969613738243) < 0.01)

        forward_model = MyokitForwardModel(
            myokit_model=self.model,
            myokit_simulator=self.simulator,
            fixed_parameter_dict={'myokit.tumour_volume': 4,
                                  'myokit.kappa': 0.1})
        z = forward_model.simulate([2, 1, 3], times)
        self.assertTrue(np.abs(z[-1] - 13.500733928623417) < 0.01)


class TestMyokitPintsForwardModelMultipleOutput(TestCase):
    def setUp(self):
        m = PharmacokineticModel.objects.get(
            name='three_compartment_pk_model',
        )
        self.model = m.get_myokit_model()
        self.simulator = m.get_myokit_simulator()

    def test_runs(self):
        full_dict = {
            'central.drug_c_amount': 1,
            'peripheral_1.drug_p1_amount': 1,
            'peripheral_2.drug_p2_amount': 1,
            'central.size': 1,
            'myokit.clearance': 1,
            'myokit.k_peripheral1': 1,
            'myokit.k_peripheral2': 1,
            'peripheral_1.size': 1,
            'peripheral_2.size': 1
        }
        fixed_dict = {
            'peripheral_1.drug_p1_amount': 1,
            'peripheral_2.drug_p2_amount': 1
        }
        variable_parameters = [1, 1, 1, 1, 1, 1, 1]
        forward_model = MyokitForwardModel(
            myokit_model=self.model,
            myokit_simulator=self.simulator,
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
            myokit_model=self.model,
            myokit_simulator=self.simulator,
            fixed_parameter_dict=fixed_dict,
            outputs=desired_outputs)
        za = forward_model.simulate(variable_parameters, times)
        self.assertTrue(np.array_equal(z, za))

        # supply no fixed dictionary
        forward_model = MyokitForwardModel(
            myokit_model=self.model,
            myokit_simulator=self.simulator,
            outputs=desired_outputs)
        zb = forward_model.simulate(list(full_dict.values()), times)
        self.assertTrue(np.array_equal(z, zb))

        # only supply two outputs as expected outputs
        desired_outputs = ['central.drug_c_amount',
                           'peripheral_2.drug_p2_amount']
        forward_model = MyokitForwardModel(
            myokit_model=self.model,
            myokit_simulator=self.simulator,
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
            myokit_model=self.model,
            myokit_simulator=self.simulator,
            fixed_parameter_dict=fixed_dict,
            outputs=desired_outputs)
        z1a = forward_model.simulate(variable_parameters, times)
        expected_shape = np.array((len(times), 2))
        self.assertTrue(np.array_equal(z1a.shape, expected_shape))
        self.assertTrue(np.array_equal(z1a[:, [1, 0]], z1))

        # only supply a single output
        desired_outputs = 'peripheral_2.drug_p2_amount'
        forward_model = MyokitForwardModel(
            myokit_model=self.model,
            myokit_simulator=self.simulator,
            fixed_parameter_dict=fixed_dict,
            outputs=desired_outputs)
        z2 = forward_model.simulate(variable_parameters, times)
        self.assertEqual(len(z2), len(times))
        self.assertTrue(np.array_equal(z2, z[:, 2]))

    def test_multiple_output_values(self):
        # Tests outputs versus known values
        forward_model = MyokitForwardModel(
            myokit_model=self.model,
            myokit_simulator=self.simulator)
        times = np.linspace(0, 100, 200)
        parameters = [100, 200, 300, 1, 0.1, 1, 2, 3, 4]
        z = forward_model.simulate(parameters, times)
        self.assertTrue(abs(z[-1, 0] - 21.588349077913126) < 0.1)
        self.assertTrue(abs(z[-1, 1] - 67.22027564773356) < 0.1)
        self.assertTrue(abs(z[-1, 2] - 88.50857171407785) < 0.1)

        # Tests fixing certain values
        fixed_dict = {
            'central.drug_c_amount': 200,
            'myokit.k_peripheral2': 7
        }
        forward_model = MyokitForwardModel(
            myokit_model=self.model,
            myokit_simulator=self.simulator,
            fixed_parameter_dict=fixed_dict)
        parameters = [200, 300, 1, 0.1, 1, 3, 4]
        z = forward_model.simulate(parameters, times)
        self.assertTrue(abs(z[-1, 0] - 25.07465781951092) < 0.1)
        self.assertTrue(abs(z[-1, 1] - 78.10130666808712) < 0.1)
        self.assertTrue(abs(z[-1, 2] - 101.0074456243745) < 0.1)

        # Same but only pulling out a few outputs
        forward_model = MyokitForwardModel(
            myokit_model=self.model,
            myokit_simulator=self.simulator,
            fixed_parameter_dict=fixed_dict,
            outputs=['peripheral_1.drug_p1_amount',
                     'peripheral_2.drug_p2_amount'])
        parameters = [200, 300, 1, 0.1, 1, 3, 4]
        z = forward_model.simulate(parameters, times)
        self.assertTrue(abs(z[-1, 0] - 78.10130666808712) < 0.1)
        self.assertTrue(abs(z[-1, 1] - 101.0074456243745) < 0.1)
