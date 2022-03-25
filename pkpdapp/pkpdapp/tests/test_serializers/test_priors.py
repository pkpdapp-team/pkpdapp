#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.test import TestCase
from pkpdapp.models import (
    Inference, PharmacodynamicModel, Project,
    PriorNormal, PriorUniform, BiomarkerType,
    LogLikelihood, Prior
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
            project=project,
        )
        biomarker_type = BiomarkerType.objects.get(
            name='Tumour volume',
            dataset__name='lxf_control_growth'
        )
        self.log_likelihood = LogLikelihood.objects.create(
            form='N',
            variable=model.variables.first(),
            inference=self.inference,
            biomarker_type=biomarker_type
        )
        parameters = self.log_likelihood.parameters.all()
        PriorNormal.objects.create(
            mean=1.0,
            sd=1.0,
            log_likelihood_parameter=parameters[0],
        )
        self.prior_uniform = PriorUniform.objects.create(
            lower=1.0,
            upper=2.0,
            log_likelihood_parameter=parameters[1],
        )

    def test_serialize(self):
        serializer = PriorSerializer(
            Prior.objects.filter(
                log_likelihood_parameter__log_likelihood=self.log_likelihood
            ),
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
