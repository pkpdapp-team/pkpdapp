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


class TestLoglikelihoodSerializer(TestCase):
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
        self.parameters = self.log_likelihood.parameters.all()
        parameter = self.parameters[0]
        LogLikelihood.objects.create(
            form='LN',
            variable=self.variables[0],
            inference=self.inference,
            biomarker_type=self.biomarker_type
        )
        PriorUniform.objects.create(
            lower=0.0,
            upper=1.0,
            log_likelihood_parameter=parameter
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
        found_index_first = -1
        found_index_second = -1
        for i in range(len(data['parameters'])):
            if data['parameters'][i]['name'] == self.parameters[0].name:
                found_index_first = i
            if data['parameters'][i]['name'] == self.parameters[1].name:
                found_index_second = i

        data['parameters'][found_index_first]['value'] = 2.0
        data['parameters'][found_index_second]['prior'] = {
            'type': 'PriorUniform',
            'lower': 0.1,
            'upper': 1.1,
        }
        validated_data = serializer.to_internal_value(data)
        serializer.update(self.log_likelihood, validated_data)
        self.parameters[0].refresh_from_db()
        self.parameters[1].refresh_from_db()
        self.assertEqual(self.parameters[0].value, 2.0)
        self.assertIsInstance(self.parameters[1].prior, PriorUniform)
        self.assertEqual(self.parameters[1].prior.lower, 0.1)
        self.assertEqual(self.parameters[1].prior.upper, 1.1)
