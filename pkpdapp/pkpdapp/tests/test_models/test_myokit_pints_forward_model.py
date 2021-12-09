#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.test import TestCase
from pkpdapp.models import (
    Inference, PharmacodynamicModel, LogLikelihoodNormal,
    LogLikelihoodLogNormal, Project, BiomarkerType,
    PriorNormal, PriorUniform,
    MyokitForwardModel
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
        self.variable_parameter_values = [self.parameter_dict[v] for v in variable_keys]

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
        z1 = forward_model.simulate(self.parameter_dict, times)
        self.assertTrue(np.array_equal(z, z1))
