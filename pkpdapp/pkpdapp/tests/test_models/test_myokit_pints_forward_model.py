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
        project = Project.objects.get(
            name='demo',
        )
        biomarker_type = BiomarkerType.objects.get(
            name='Tumour volume',
            dataset__name='lxf_control_growth'
        )
        m = PharmacodynamicModel.objects.get(
            name='tumour_growth_inhibition_model_koch',
        )
        self.model = m.get_myokit_model()
        self.simulator = m.get_myokit_simulator()

        parameter_dict = {
            'myokit.tumour_volume', 1,
            'myokit.lambda', 1,
            'myokit.critical_volume', 1,
            'myokit.kappa', 1,
            'myokit.drug_concentration', 1,
        }

        all_keys = list(parameter_dict.keys())
        fixed_dict = {
            'myokit.lambda', 3,
            'myokit.critical_volume', 2,
        }
        variable_keys = (
            [k for k in all_keys if k not in list(fixed_dict.keys())]
        )
        self.variable_parameter_values = [parameter_dict[v] for v in variable_keys]

    def test_run_myokit_pints_forward_model(self):
        times = np.linspace(0, 100)

        forward_model = MyokitForwardModel(
            myokit_model=self.model,
            myokit_simulator=self.simulator)

        z = forward_model.simulate(self.variable_parameter_values, times)
