#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.test import TestCase
from pkpdapp.models import (
    PharmacodynamicModel, LogLikelihoodNormal,
    LogLikelihoodLogNormal, Project, BiomarkerType,
    Inference,
)
from pkpdapp.api.serializers import (
    ObjectiveFunctionSerializer
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

    def test_serialize(self):
        serializer = ObjectiveFunctionSerializer(
            self.inference.objective_functions.all(),
            many=True
        )
        data = serializer.data
        self.assertEqual(len(data), 2)
        self.assertTrue(
            data[0]['type'] == 'LogLikelihoodNormal' or
            data[0]['type'] == 'LogLikelihoodLogNormal'
        )
        self.assertTrue(
            data[1]['type'] == 'LogLikelihoodNormal' or
            data[1]['type'] == 'LogLikelihoodLogNormal'
        )
        self.assertNotEqual(
            data[0]['type'], data[1]['type']
        )
