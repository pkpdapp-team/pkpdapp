#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.test import TestCase
from pkpdapp.models import (
    DraftInference, PharmacodynamicModel, Project, BiomarkerType,
    Prior, PriorNormal, PriorUniform,
)
from pkpdapp.api.serializers import (
    PriorSerializer
)
from django.utils import timezone
from django.db.utils import IntegrityError

class TestPriorSerializer(TestCase):
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
        self.inference = DraftInference.objects.create(
            pd_model=model,
            project=project,
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

    def test_serialize(self):
        serializer = PriorSerializer(
            self.inference.priors.all(),
            many=True
        )
        data = serializer.data
        self.assertEqual(len(data), 2)
        self.assertTrue(
            data[0]['type'] == 'PriorNormal' or
            data[0]['type'] == 'PriorUniform'
        )
        self.assertTrue(
            data[1]['type'] == 'PriorUniform' or
            data[1]['type'] == 'PriorNormal'
        )
        self.assertNotEqual(
            data[0]['type'], data[1]['type']
        )




