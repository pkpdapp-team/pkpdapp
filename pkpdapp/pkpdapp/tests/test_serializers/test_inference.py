#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from django.test import TestCase
from rest_framework.exceptions import ValidationError
from pkpdapp.models import (
    InferenceMixin
)
from pkpdapp.api.serializers import (
    InferenceSerializer, InferenceChainSerializer,
)
from pkpdapp.tests import create_pd_inference


class TestInferenceSerializer(TestCase):
    def setUp(self):
        self.inference, log_likelihood, biomarker_type, \
            _, self.model, _ = create_pd_inference(
                sampling=False)

        # set uniform prior on everything, except amounts
        for i, param in enumerate(
                log_likelihood.parameters.all()
        ):
            if i == 0:
                param.set_uniform_prior(
                    0.0, 2.0, biomarker_type=biomarker_type
                )
            else:
                param.set_uniform_prior(0.0, 2.0)

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
        # create mixin object
        inference_mixin = InferenceMixin(self.inference)
        inference_mixin.run_inference()

        chain = self.inference.chains.first()
        chain_serializer = InferenceChainSerializer(chain)
        data = chain_serializer.data
        self.assertTrue('outputs' in data)
        self.assertTrue(len(data['outputs']) > 0)
        self.assertTrue('data' in data)
        self.assertTrue('kde' in data['data'])
        self.assertTrue(len(data['data']['kde']) > 0)
        self.assertTrue('chain' in data['data'])
        self.assertTrue(len(data['data']['chain']) > 0)
