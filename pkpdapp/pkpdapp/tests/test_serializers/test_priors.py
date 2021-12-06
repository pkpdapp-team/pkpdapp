#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.test import TestCase
from pkpdapp.models import (
    Inference, PharmacodynamicModel, Project,
    PriorNormal, PriorUniform,
)
from pkpdapp.api.serializers import (
    PriorSerializer
)


class TestPriorSerializer(TestCase):
    def setUp(self):
        project = Project.objects.get(
            name='demo',
        )
        model = PharmacodynamicModel.objects.get(
            name='tumour_growth_inhibition_model_koch',
        )
        variables = model.variables.all()
        self.inference = Inference.objects.create(
            pd_model=model,
            project=project,
        )
        PriorNormal.objects.create(
            mean=1.0,
            sd=1.0,
            variable=variables[0],
            inference=self.inference,
        )
        self.prior_uniform = PriorUniform.objects.create(
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

    def test_update(self):
        serializer = PriorSerializer(
            self.prior_uniform
        )
        data = serializer.data
        data['lower'] = 0.0

        validated_data = serializer.to_internal_value(data)
        serializer.update(self.prior_uniform, validated_data)
        self.assertEqual(self.prior_uniform.lower, 0.0)
