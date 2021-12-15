#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.test import TestCase
import numpy as np
from pkpdapp.models import (
    Inference, PharmacodynamicModel, LogLikelihoodNormal,
    Project, BiomarkerType,
    PriorUniform, MyokitForwardModel,
    InferenceMixin
)


class TestInferenceMixin(TestCase):
    def setUp(self):
        project = Project.objects.get(
            name='demo',
        )
        biomarker_type = BiomarkerType.objects.get(
            name='Tumour volume',
            dataset__name='lxf_control_growth'
        )
        model = PharmacodynamicModel.objects.get(
            name='tumour_growth_inhibition_model_koch',
        )
        variables = model.variables.all()
        var_names = [v.qname for v in variables]
        m = model.get_myokit_model()
        s = model.get_myokit_simulator()

        forward_model = MyokitForwardModel(
            myokit_model=m,
            myokit_simulator=s,
            outputs="myokit.tumour_volume")

        # generate some fake data
        parameter_dict = {
            'myokit.tumour_volume': 1,
            'myokit.lambda_0': 1,
            'myokit.lambda_1': 1,
            'myokit.kappa': 1,
            'myokit.drug_concentration': 1,
        }
        times = np.linspace(0, 100)
        z = forward_model.simulate(list(parameter_dict.values()), times)

        output_names = forward_model.output_names()
        var_index = var_names.index(output_names[0])

        self.inference = Inference.objects.create(
            name='bob',
            pd_model=model,
            project=project,
        )
        LogLikelihoodNormal.objects.create(
            sd=1.0,
            variable=variables[var_index],
            inference=self.inference,
            biomarker_type=biomarker_type
        )

        # find variables that are being estimated
        parameter_names = forward_model.variable_parameter_names()
        var_indices = [var_names.index(v) for v in parameter_names]

        for i in var_indices:
            PriorUniform.objects.create(
                lower=0.0,
                upper=2.0,
                variable=variables[i],
                inference=self.inference,
            )
        # 'run' inference to create copies of models
        self.inference = self.inference.run_inference()

        # create mixin object
        self.inference_mixin = InferenceMixin(self.inference)

    def test_objective_functions(self):

        pints_forward_model = self.inference_mixin.create_pints_forward_model()
        problem_collection = self.inference_mixin.create_pints_problem_collection()
        log_likelihood = self.inference_mixin.create_pints_log_likelihood()
