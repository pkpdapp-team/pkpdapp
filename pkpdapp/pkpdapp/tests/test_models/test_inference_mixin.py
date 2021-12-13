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
        print(variables[0].name)
        self.inference = Inference.objects.create(
            name='bob',
            pd_model=model,
            project=project,
        )
        LogLikelihoodNormal.objects.create(
            sd=1.0,
            variable=variables[0],
            inference=self.inference,
            biomarker_type=biomarker_type
        )
        LogLikelihoodLogNormal.objects.create(
            sigma=2.0,
            variable=variables[1],
            inference=self.inference,
            biomarker_type=biomarker_type
        )
        PriorNormal.objects.create(
            mean=1.0,
            sd=1.0,
            variable=variables[0],
            inference=self.inference,
        )
        PriorUniform.objects.create(
            lower=1.0,
            upper=2.0,
            variable=variables[0],
            inference=self.inference,
        )
        # 'run' inference to create copies of models
        self.inference = self.inference.run_inference()

    def test_objective_functions(self):
        pass
