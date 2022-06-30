#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.test import TestCase
from numpy.testing import assert_almost_equal
from pkpdapp.models import (
    PharmacodynamicModel,
    MyokitForwardModel,
    PharmacokineticModel
)
import numpy as np


class TestMyokitForwardModelSingleOutput(TestCase):
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
            outputs=["myokit.tumour_volume"],
            times=[times],
            fixed_parameter_dict=self.fixed_dict,
        )

        z = forward_model.simulate(self.variable_parameter_values)
        self.assertEqual(len(z), 1)
        self.assertEqual(len(z[0]), len(times))

        # try without any fixed parameters
        forward_model = MyokitForwardModel(
            myokit_model=self.model,
            myokit_simulator=self.simulator,
            outputs=["myokit.tumour_volume"],
            times=[times],
        )
        z1 = forward_model.simulate(list(self.parameter_dict.values()))
        self.assertTrue(np.array_equal(z, z1))

        # try model with different variable parameters and check output differs
        new_fixed_dict = {
            'myokit.tumour_volume': 2,
            'myokit.lambda_0': 3,
            'myokit.drug_concentration': 7.5,
        }
        forward_model = MyokitForwardModel(
            myokit_model=self.model,
            myokit_simulator=self.simulator,
            outputs=["myokit.tumour_volume"],
            times=[times],
            fixed_parameter_dict=new_fixed_dict
        )
        z3 = forward_model.simulate(self.variable_parameter_values)
        self.assertTrue(not np.array_equal(z3, z))

        # check model with different parameter inputs gives different result
        self.variable_parameter_values[0] = 7
        forward_model = MyokitForwardModel(
            myokit_model=self.model,
            myokit_simulator=self.simulator,
            outputs=["myokit.tumour_volume"],
            times=[times],
            fixed_parameter_dict=new_fixed_dict
        )
        z4 = forward_model.simulate(self.variable_parameter_values)
        self.assertTrue(not np.array_equal(z4, z3))

        # try with subjects now, should get same result
        times = np.linspace(0, 100)
        n_subjects = 7
        subjects = list(range(n_subjects)) * (len(times) // n_subjects + 1)
        subjects = subjects[:len(times)]
        all_keys = list(self.parameter_dict.keys())

        fixed_dict = {
            'myokit.tumour_volume': self.fixed_dict['myokit.tumour_volume'],
            'myokit.lambda_0':
                [self.fixed_dict['myokit.lambda_0']] * n_subjects,
            'myokit.drug_concentration':
                self.fixed_dict['myokit.drug_concentration'],
        }

        variable_keys = (
            [k for k in all_keys if k not in list(self.fixed_dict.keys())]
        )
        variable_parameter_values = [
            [self.parameter_dict[v]] * n_subjects for v in variable_keys
        ]
        variable_parameter_values = np.array(variable_parameter_values)
        print('variable_parameter_values', variable_parameter_values.shape)

        forward_model = MyokitForwardModel(
            myokit_model=self.model,
            myokit_simulator=self.simulator,
            outputs=["myokit.tumour_volume"],
            times=[times],
            subjects=[subjects],
            fixed_parameter_dict=fixed_dict,
        )

        z_subjects = forward_model.simulate(variable_parameter_values)
        self.assertEqual(len(z_subjects), 1)
        self.assertEqual(len(z_subjects[0]), len(times))
        np.testing.assert_almost_equal(z_subjects[0], z[0])

    def test_values(self):
        times = np.linspace(0, 100)

        forward_model = MyokitForwardModel(
            myokit_model=self.model,
            myokit_simulator=self.simulator,
            outputs=["myokit.tumour_volume"],
            times=[times],
        )
        z = forward_model.simulate([1, 1, 1, 1, 1])
        self.assertAlmostEqual(z[0][-1], 0.4999996148976773, delta=0.1)

        tumour_volume = 2
        z = forward_model.simulate([tumour_volume, 1, 1, 1, 1])
        self.assertAlmostEqual(z[0][0], tumour_volume, delta=0.1)

        z = forward_model.simulate([tumour_volume, 2, 1, 1, 1])
        self.assertAlmostEqual(z[0][-1], 0.0025839360953396786, delta=0.1)

        z = forward_model.simulate([tumour_volume, 2, 0.1, 1, 1])
        self.assertAlmostEqual(z[0][-1], 4.499969613738243, delta=0.1)

        # add some fixed parameters
        forward_model = MyokitForwardModel(
            myokit_model=self.model,
            myokit_simulator=self.simulator,
            outputs=["myokit.tumour_volume"],
            times=[times],
            fixed_parameter_dict={'myokit.tumour_volume': 2}
        )
        z = forward_model.simulate([2, 0.1, 1, 1])
        self.assertAlmostEqual(z[0][-1], 4.499969613738243, delta=0.1)

        forward_model = MyokitForwardModel(
            myokit_model=self.model,
            myokit_simulator=self.simulator,
            outputs=["myokit.tumour_volume"],
            times=[times],
            fixed_parameter_dict={'myokit.tumour_volume': 4,
                                  'myokit.kappa': 0.1}
        )
        z = forward_model.simulate([2, 1, 3])
        self.assertAlmostEqual(z[0][-1], 13.500733928623417, delta=0.1)


class TestMyokitPintsForwardModelMultipleOutput(TestCase):
    def setUp(self):
        m = PharmacokineticModel.objects.get(
            name='three_compartment_pk_model',
        )
        self.model = m.get_myokit_model()
        self.simulator = m.get_myokit_simulator()

    def test_runs(self):
        # all parameters are:
        # full_dict = {
        #     'central.drug_c_amount': 1,
        #     'peripheral_1.drug_p1_amount': 1,
        #     'peripheral_2.drug_p2_amount': 1,
        #     'central.size': 1,
        #     'myokit.clearance': 1,
        #     'myokit.drug_c_scale_factor': 1,
        #     'myokit.k_peripheral1': 1,
        #     'myokit.k_peripheral2': 1,
        #     'peripheral_1.size': 1,
        #     'peripheral_2.size': 1
        # }
        fixed_dict = {
            'peripheral_1.drug_p1_amount': 1,
            'peripheral_2.drug_p2_amount': 1,
            'myokit.drug_c_scale_factor': 1,
        }
        variable_parameters = [1, 1, 1, 1, 1, 1, 1]

        desired_outputs = [
            'central.drug_c_amount',
            'peripheral_1.drug_p1_amount',
            'peripheral_2.drug_p2_amount'
        ]

        times = [
            np.linspace(0, 100, 33),
            np.linspace(0, 100, 10),
            np.linspace(0, 100, 20),
        ]

        forward_model = MyokitForwardModel(
            myokit_model=self.model,
            myokit_simulator=self.simulator,
            fixed_parameter_dict=fixed_dict,
            outputs=desired_outputs,
            times=times,
        )

        z = forward_model.simulate(variable_parameters)
        self.assertEqual(len(z), 3)
        self.assertEqual(len(z[0]), 33)
        self.assertEqual(len(z[1]), 10)
        self.assertEqual(len(z[2]), 20)

        # do another ordering
        desired_outputs = [
            'peripheral_2.drug_p2_amount',
            'central.drug_c_amount',
            'peripheral_1.drug_p1_amount',
        ]

        times = [
            np.linspace(0, 100, 20),
            np.linspace(0, 100, 33),
            np.linspace(0, 100, 10),
        ]

        forward_model = MyokitForwardModel(
            myokit_model=self.model,
            myokit_simulator=self.simulator,
            outputs=desired_outputs,
            times=times,
            fixed_parameter_dict=fixed_dict,
        )

        z_new = forward_model.simulate(variable_parameters)
        assert_almost_equal(z_new[0], z[2])
        assert_almost_equal(z_new[1], z[0])
        assert_almost_equal(z_new[2], z[1])
