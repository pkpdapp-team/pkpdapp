#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import pkpdapp.tests  # noqa: F401
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
            name='tumour_growth_gompertz',
        )
        self.model = m.get_myokit_model()
        self.simulator = m.get_myokit_simulator()

        self.parameter_dict = {
            'PDCompartment.beta': 1,
            'PDCompartment.TS0': 1,
            'PDCompartment.TSmax': 1,
        }

        all_keys = list(self.parameter_dict.keys())
        self.fixed_dict = {
            'PDCompartment.TS0': 1,
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
            outputs=["PDCompartment.TS"],
            times=[times],
            fixed_parameter_dict=self.fixed_dict,
            conversion_factors=[1.0],
        )

        z = forward_model.simulate(self.variable_parameter_values)
        self.assertEqual(len(z), 1)
        self.assertEqual(len(z[0]), len(times))

        # try without any fixed parameters
        forward_model = MyokitForwardModel(
            myokit_model=self.model,
            myokit_simulator=self.simulator,
            outputs=["PDCompartment.TS"],
            times=[times],
            conversion_factors=[1.0],
        )
        z1 = forward_model.simulate(list(self.parameter_dict.values()))
        self.assertTrue(np.array_equal(z, z1))

        # try model with different variable parameters and check output differs
        new_fixed_dict = {
            'PDCompartment.TS0': 2,
        }
        forward_model = MyokitForwardModel(
            myokit_model=self.model,
            myokit_simulator=self.simulator,
            outputs=["PDCompartment.TS"],
            times=[times],
            fixed_parameter_dict=new_fixed_dict,
            conversion_factors=[1.0],
        )
        z3 = forward_model.simulate(self.variable_parameter_values)
        self.assertTrue(not np.array_equal(z3, z))

        # check model with different parameter inputs gives different result
        self.variable_parameter_values[0] = 7
        forward_model = MyokitForwardModel(
            myokit_model=self.model,
            myokit_simulator=self.simulator,
            outputs=["PDCompartment.TS"],
            times=[times],
            fixed_parameter_dict=new_fixed_dict,
            conversion_factors=[1.0],
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
            'PDCompartment.TS0': [1] * n_subjects,
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
            outputs=["PDCompartment.TS"],
            times=[times],
            subjects=[subjects],
            fixed_parameter_dict=fixed_dict,
            conversion_factors=[1.0],
        )

        z_subjects = forward_model.simulate(variable_parameter_values)
        self.assertEqual(len(z_subjects), 1)
        self.assertEqual(len(z_subjects[0]), len(times))
        np.testing.assert_almost_equal(z_subjects[0], z[0])




class TestMyokitPintsForwardModelMultipleOutput(TestCase):
    def setUp(self):
        m = PharmacokineticModel.objects.get(
            name='three_compartment_preclinical',
        )
        self.model = m.get_myokit_model()
        self.simulator = m.get_myokit_simulator()

    def test_runs(self):
        # all parameters are:
        #full_dict = {
        #    'PKCompartment.tlag': 1,
        #    'PKCompartment.ka': 1,
        #    'PKCompartment.F': 1,
        #    'PKCompartment.V1': 1,
        #    'PKCompartment.V2': 1,
        #    'PKCompartment.V3': 1,
        #    'PKCompartment.CL': 1,
        #    'PKCompartment.Q1': 1,
        #    'PKCompartment.Q2': 1,
        #    'PKCompartment.CLmax': 1,
        #    'PKCompartment.Km': 1,
        #    'PKCompartment.ke0': 1,
        #    'PKCompartment.Kpu': 1,
        #}
        fixed_dict = {
            'PKCompartment.tlag': 1,
            'PKCompartment.CLmax': 1,
            'PKCompartment.ke0': 1,
        }
        variable_parameters = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]

        desired_outputs = [
            'PKCompartment.A1',
            'PKCompartment.A2',
            'PKCompartment.A3',
        ]

        conversion_factors = [
            1.0,
            1.0,
            1.0,
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
            conversion_factors=conversion_factors
        )

        z = forward_model.simulate(variable_parameters)
        self.assertEqual(len(z), 3)
        self.assertEqual(len(z[0]), 33)
        self.assertEqual(len(z[1]), 10)
        self.assertEqual(len(z[2]), 20)

        # do another ordering
        desired_outputs = [
            'PKCompartment.A3',
            'PKCompartment.A1',
            'PKCompartment.A2',
        ]

        conversion_factors = [
            1.0,
            1.0,
            1.0,
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
            conversion_factors=conversion_factors
        )

        z_new = forward_model.simulate(variable_parameters)
        assert_almost_equal(z_new[0], z[2])
        assert_almost_equal(z_new[1], z[0])
        assert_almost_equal(z_new[2], z[1])
