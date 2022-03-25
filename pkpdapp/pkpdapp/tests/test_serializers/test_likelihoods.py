#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.test import TestCase
from pkpdapp.models import (
    PharmacodynamicModel, LogLikelihood,
    Project, BiomarkerType,
    Inference, PriorUniform
)
from pkpdapp.api.serializers import (
    LogLikelihoodSerializer
)


class TestObjectiveFunctionSerializer(TestCase):
    def setUp(self):
        project = Project.objects.get(
            name='demo',
        )
        self.biomarker_type = BiomarkerType.objects.get(
            name='Tumour volume',
            dataset__name='lxf_control_growth'
        )
        model = PharmacodynamicModel.objects.get(
            name='tumour_growth_inhibition_model_koch',
        )
        self.variables = model.variables.all()
        self.inference = Inference.objects.create(
            project=project,
        )
        self.log_likelihood = LogLikelihood.objects.create(
            form='N',
            variable=self.variables[0],
            inference=self.inference,
            biomarker_type=self.biomarker_type
        )
        self.parameter = self.log_likelihood.parameters.first()
        LogLikelihood.objects.create(
            form='LN',
            variable=self.variables[0],
            inference=self.inference,
            biomarker_type=self.biomarker_type
        )
        PriorUniform.objects.create(
            lower=0.0,
            upper=1.0,
            log_likelihood_parameter=self.parameter
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

    def test_update(self):
        serializer = LogLikelihoodSerializer(self.log_likelihood)
        data = serializer.data
        found_index = -1
        for i in range(len(data['parameters'])):
            if data['parameters'][i]['name'] == self.parameter.name:
                found_index = i
                break

        data['parameters'][found_index]['value'] = 2.0
        validated_data = serializer.to_internal_value(data)
        serializer.update(self.log_likelihood, validated_data)
        self.parameter.refresh_from_db()
        self.assertEqual(self.parameter.value, 2.0)
