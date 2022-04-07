#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.test import TestCase
from rest_framework.exceptions import ValidationError
from pkpdapp.models import (
    Inference, PharmacodynamicModel, LogLikelihood,
    Project, BiomarkerType,
    PriorUniform,
    MyokitForwardModel,
    Algorithm, InferenceMixin
)
from pkpdapp.api.serializers import (
    InferenceSerializer, InferenceChainSerializer,
)


class TestInferenceSerializer(TestCase):
    def setUp(self):
        project = Project.objects.get(
            name='demo',
        )
        self.biomarker_type = BiomarkerType.objects.get(
            name='Tumour volume',
            dataset__name='lxf_control_growth'
        )
        self.model = PharmacodynamicModel.objects.get(
            name='tumour_growth_inhibition_model_koch',
        )
        self.inference = Inference.objects.create(
            project=project,
        )
        self.log_likelihood = LogLikelihood.objects.create(
            name='tumour_growth_inhibition_model_koch',
            inference=self.inference,
            variable=self.model.variables.first(),
            biomarker_type=self.biomarker_type,
            form=LogLikelihood.Form.MODEL
        )
        self.parameters = self.log_likelihood.parameters.all()
        self.prior = self.parameters[0].child

    def test_create(self):
        serializer = InferenceSerializer()
        data = {
            'name': 'test',
            'log_likelihoods': [],
            'project': self.inference.project.id,
        }
        validated_data = serializer.to_internal_value(data)
        new_inference = serializer.create(validated_data)
        self.assertEqual(new_inference.name, 'test')
        self.assertEqual(len(new_inference.log_likelihoods.all()), 0)

    def test_update(self):
        serializer = InferenceSerializer(
            self.inference
        )
        data = serializer.data
        old_number_of_loglikelihoods = len(data['log_likelihoods'])
        data['name'] = 'fred'
        data['log_likelihoods'].append({
            'name': 'x',
            'form': 'N',
            'parameters': [],
        })
        validated_data = serializer.to_internal_value(data)
        serializer.update(self.inference, validated_data)
        self.assertEqual(self.inference.name, 'fred')

        # new prior will add three new log_likelihood
        # since a normal has 2 params
        self.assertEqual(
            len(self.inference.log_likelihoods.all()),
            old_number_of_loglikelihoods + 3
        )

        # do it again with the same name, should have validation error
        serializer = InferenceSerializer(
            self.inference
        )
        data = serializer.data
        old_number_of_loglikelihoods = len(data['log_likelihoods'])
        data['log_likelihoods'].append({
            'name': 'x',
            'form': 'N',
            'parameters': [],
        })
        with self.assertRaisesRegex(
            ValidationError,
            "all log_likelihoods in an inference must have unique names"
        ):
            validated_data = serializer.to_internal_value(data)

    def test_inference_results(self):
        # 'run' inference to create copies of models
        self.inference.run_inference(test=True)

        # create mixin object
        inference_mixin = InferenceMixin(self.inference)
        inference_mixin.run_inference()

        chain = self.inference.chains.first()
        chain_serializer = InferenceChainSerializer(chain)
        data = chain_serializer.data
        self.assertTrue('outputs' in data)
        self.assertTrue('log_likelihoods' in data['outputs'])
        self.assertTrue('outputs' in data['outputs'])
        self.assertEqual(len(data['outputs']['outputs']), 1)
        self.assertEqual(len(data['outputs']['outputs'][0]['times']), 14)
