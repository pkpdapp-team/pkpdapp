#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from django.test import TestCase
from pkpdapp.api.serializers import (
    LogLikelihoodSerializer
)
from pkpdapp.tests import create_pd_inference


class TestLoglikelihoodSerializer(TestCase):
    def setUp(self):
        self.inference, self.log_likelihood, self.biomarker_type, \
            _, self.model, _ = create_pd_inference()
        self.parameters = self.log_likelihood.parameters.all()
        self.prior = self.parameters[0].child

    def test_serialize(self):
        serializer = LogLikelihoodSerializer(
            self.inference.log_likelihoods.all(),
            many=True
        )
        data = serializer.data
        self.assertEqual(len(data), 6)

    def test_update(self):
        serializer = LogLikelihoodSerializer(self.prior)
        data = serializer.data

        # update fixed value of 1st param
        data['form'] = 'N'

        validated_data = serializer.to_internal_value(data)
        serializer.update(self.prior, validated_data)
        self.assertEqual(self.prior.parameters.count(), 2)
