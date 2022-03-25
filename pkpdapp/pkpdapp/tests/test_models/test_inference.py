#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.test import TestCase
from pkpdapp.models import (
    Inference, PharmacodynamicModel, LogLikelihood,
    Project, BiomarkerType,
    PriorNormal, PriorUniform,
)


class TestInferenceSerializer(TestCase):
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
        self.inference = Inference.objects.create(
            name='bob',
            project=project,
        )
        LogLikelihood.objects.create(
            form='N',
            variable=variables[0],
            inference=self.inference,
            biomarker_type=biomarker_type
        )


    def test_run_inference(self):
        self.inference.run_inference(test=True)
        self.assertEqual(self.inference.name, 'bob')
        self.assertEqual(self.inference.read_only, True)
        self.assertEqual(self.inference.log_likelihoods.count(), 1)
