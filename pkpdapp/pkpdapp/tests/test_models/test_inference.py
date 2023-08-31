#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from django.test import TestCase
from pkpdapp.models import (
    InferenceResult, InferenceMixin,
    InferenceFunctionResult
)
import numpy as np
from pkpdapp.tests import create_pd_inference


class TestInferenceSerializer(TestCase):
    def setUp(self):
        self.inference, log_likelihood, _, _, \
            self.model, _ = create_pd_inference(
                sampling=False)

        # set uniform prior on first param, except amounts
        self.param = log_likelihood.parameters.first()
        self.param.set_uniform_prior(0.0, 2.0)

    def test_run_inference(self):
        self.inference.run_inference(test=True)
        self.assertEqual(self.inference.name, 'bob')
        self.assertEqual(self.inference.log_likelihoods.count(), 8)

    def test_set_variables_from_inference(self):
        inference_mixin = InferenceMixin(self.inference)
        inference_mixin.run_inference()
        chains = self.inference.chains.all()
        results = np.array(InferenceResult.objects.filter(
            chain__in=chains
        ).order_by(
            'iteration', 'chain'
        ).values_list('value', flat=True))
        fresults = np.array(InferenceFunctionResult.objects.filter(
            chain__in=chains
        ).order_by(
            'iteration', 'chain'
        ).values_list('value', flat=True))
        max_value = results[np.argmax(fresults)]

        fitted_variable = self.param.variable
        old_value = fitted_variable.default_value
        self.model.set_variables_from_inference(self.inference)
        fitted_variable.refresh_from_db()
        new_value = fitted_variable.default_value
        self.assertEqual(new_value, max_value)
        self.assertNotEqual(old_value, new_value)
