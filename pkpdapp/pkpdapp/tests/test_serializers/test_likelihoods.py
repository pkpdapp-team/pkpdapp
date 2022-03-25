#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.test import TestCase
from pkpdapp.models import (
    PharmacodynamicModel, LogLikelihood,
    Project, BiomarkerType,
    Inference,
)
from pkpdapp.api.serializers import (
    LogLikelihoodSerializer
)


class TestObjectiveFunctionSerializer(TestCase):
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
            project=project,
        )
        LogLikelihood.objects.create(
            form='N',
            variable=variables[0],
            inference=self.inference,
            biomarker_type=biomarker_type
        )
        LogLikelihood.objects.create(
            form='LN',
            variable=variables[0],
            inference=self.inference,
            biomarker_type=biomarker_type
        )

    def test_serialize(self):
        serializer = LogLikelihoodSerializer(
            self.inference.log_likelihoods.all(),
            many=True
        )
        data = serializer.data
        self.assertEqual(len(data), 2)
        self.assertTrue(
            data[0]['form'] == 'N' or
            data[0]['form'] == 'LN'
        )
        self.assertTrue(
            data[1]['form'] == 'N' or
            data[1]['form'] == 'LN'
        )
        self.assertNotEqual(
            data[0]['form'], data[1]['form']
        )
