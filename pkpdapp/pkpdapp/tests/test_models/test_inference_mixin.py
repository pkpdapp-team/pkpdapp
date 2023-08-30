#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.test import TestCase
import numpy as np
from pkpdapp.models import (
    LogLikelihood,
    InferenceMixin, InferenceChain, InferenceResult,
    InferenceFunctionResult, LogLikelihoodParameter,
)
from pkpdapp.tests import create_pd_inference
from django.core.cache import cache


class TestInferenceMixinSingleOutputSampling(TestCase):
    def setUp(self):
        # ensure we've got nothing in the cache
        cache._cache.flush_all()

        self.inference, log_likelihood, _, _, _, _ = create_pd_inference(True)

        # set uniform prior on everything, except amounts
        for param in log_likelihood.parameters.all():
            param.set_uniform_prior(0.0, 2.0)

        # 'run' inference to create copies of models
        self.inference.run_inference(test=True)

        # create mixin object
        self.inference_mixin = InferenceMixin(self.inference)

    def test_objective_functions(self):
        # Test log-posterior
        log_posterior = self.inference_mixin._pints_log_posterior
        log_posterior(
            log_posterior.to_search([1.3, 0.5, 1.1, 0.9, 1.2, 1])
        )

    def test_inference_runs(self):
        # tests that inference runs and writes results to db

        self.inference_mixin.run_inference()

        chains = self.inference_mixin.inference.chains.all()
        self.assertEqual(len(chains), 3)
        for chain in chains:
            priors = self.inference_mixin._priors
            fun_res = chain.inference_function_results
            f_vals = fun_res.order_by('iteration').values_list(
                'value', flat=True
            )
            self.assertEqual(len(f_vals), 11)
            p_vals_all = []
            for prior in priors:
                res = chain.inference_results.filter(log_likelihood=prior)
                p_vals = res.order_by('iteration').values_list(
                    'value', flat=True
                )
                self.assertEqual(len(p_vals), 11)
                p_vals_all.append(p_vals)
            iterations = res.order_by('iteration').values_list(
                'iteration', flat=True
            )
            expected = list(range(11))
            self.assertTrue(np.array_equal(iterations, expected))

            # transpose list of lists
            p_vals_all = list(map(list, zip(*p_vals_all)))
            fn = self.inference_mixin._pints_log_posterior
            for idx, params in enumerate(p_vals_all):
                print(f'comparing {fn(fn.to_search(params))} to {f_vals[idx]}')
                self.assertTrue(
                    abs(fn(fn.to_search(params)) - f_vals[idx]) < 0.01
                )

            output_res = chain.inference_output_results.all()
            self.assertTrue(len(output_res), 28)

        inference = self.inference_mixin.inference
        self.assertTrue(inference.time_elapsed > 0)
        self.assertTrue(inference.number_of_function_evals > 0)


class TestInferenceMixinSingleOutput(TestCase):
    def setUp(self):
        # ensure we've got nothing in the cache
        cache._cache.flush_all()

        self.inference, log_likelihood, _, _, _, _ = create_pd_inference()

        # set uniform prior on everything, except amounts
        for param in log_likelihood.parameters.all():
            param.set_uniform_prior(0.0, 2.0)

        # 'run' inference to create copies of models
        self.inference.run_inference(test=True)

        # create mixin object
        self.inference_mixin = InferenceMixin(self.inference)

    def test_inference_runs(self):
        # tests that inference runs and writes results to db
        self.inference_mixin.run_inference()

        chains = self.inference_mixin.inference.chains.all()
        self.assertEqual(len(chains), 3)
        priors = self.inference_mixin._priors
        for chain in chains:
            fun_res = chain.inference_function_results
            f_vals = fun_res.order_by('iteration').values_list(
                'value', flat=True
            )
            self.assertEqual(len(f_vals), 11)
            p_vals_all = []
            for prior in priors:
                res = chain.inference_results.filter(log_likelihood=prior)
                p_vals = res.order_by('iteration').values_list(
                    'value', flat=True
                )
                self.assertEqual(len(p_vals), 11)
                p_vals_all.append(p_vals)
                iterations = res.order_by('iteration').values_list(
                    'iteration', flat=True
                )
                expected = list(range(11))
                self.assertTrue(np.array_equal(iterations, expected))

        # don't test for inference log_posterior(param) = fn since they won't
        # because of the way the 'best' params are picked

        inference = self.inference_mixin.inference
        self.assertTrue(inference.time_elapsed > 0)
        self.assertTrue(inference.number_of_function_evals > 0)

    def test_inference_can_be_restarted(self):
        self.inference.chains.all().delete()
        self.inference.chains.set([
            InferenceChain.objects.create(inference=self.inference)
            for i in range(self.inference.number_of_chains)
        ])
        self.inference.refresh_from_db()
        for chain in self.inference.chains.all():
            chain.inference_function_results.add(
                InferenceFunctionResult.objects.create(
                    chain=chain,
                    iteration=0,
                    value=1.4
                ),
                InferenceFunctionResult.objects.create(
                    chain=chain,
                    iteration=1,
                    value=2.4
                )
            )
            for prior in self.inference_mixin._priors:
                chain.inference_results.add(
                    InferenceResult.objects.create(
                        chain=chain,
                        log_likelihood=prior,
                        iteration=0,
                        value=0.5,
                    ),
                    InferenceResult.objects.create(
                        chain=chain,
                        log_likelihood=prior,
                        iteration=1,
                        value=0.4,
                    )
                )
            chain.refresh_from_db()
        self.inference.number_of_iterations = 1
        self.inference.save()

        # tests that inference runs and writes results to db
        inference_mixin = InferenceMixin(self.inference)
        inference_mixin.run_inference()

        chains = inference_mixin.inference.chains.all()
        self.assertEqual(len(chains), 3)
        for chain in chains:
            priors = inference_mixin._priors
            fun_res = chain.inference_function_results
            f_vals = fun_res.order_by('iteration').values_list(
                'value', flat=True
            )
            self.assertEqual(len(f_vals), 11)
            p_vals_all = []
            for prior in priors:
                res = chain.inference_results.filter(log_likelihood=prior)
                p_vals = res.order_by('iteration').values_list(
                    'value', flat=True
                )
                self.assertEqual(len(p_vals), 11)
                p_vals_all.append(p_vals)
                iterations = res.order_by('iteration').values_list(
                    'iteration', flat=True
                )
                expected = list(range(11))
                self.assertTrue(np.array_equal(iterations, expected))


class TestInferenceMixinSingleOutputOptimisationPopulation(TestCase):
    def setUp(self):
        # ensure we've got nothing in the cache
        cache._cache.flush_all()

        self.inference, log_likelihood, biomarker_type, \
            _, _, _ = create_pd_inference()

        # set uniform prior on everything, except
        # we'll do a population prior on the first one
        for i, param in enumerate(log_likelihood.parameters.all()):
            if i == 0:
                param.set_uniform_prior(
                    0.0, 2.0, biomarker_type=biomarker_type
                )
            else:
                param.set_uniform_prior(0.0, 2.0)

        # 'run' inference to create copies of models
        self.inference.run_inference(test=True)

        # create mixin object
        self.inference_mixin = InferenceMixin(self.inference)

    def test_inference_runs(self):
        # tests that inference runs and writes results to db
        self.inference_mixin.run_inference()

        chains = self.inference_mixin.inference.chains.all()
        self.assertEqual(len(chains), 3)
        priors = self.inference_mixin._priors
        for chain in chains:
            fun_res = chain.inference_function_results
            f_vals = fun_res.order_by('iteration').values_list(
                'value', flat=True
            )
            self.assertEqual(len(f_vals), 11)
            for prior in priors:
                res = chain.inference_results.filter(log_likelihood=prior)
                p_vals = res.order_by('iteration').values_list(
                    'value', flat=True
                )
                length = prior.get_total_length()
                self.assertEqual(len(p_vals), 11 * length)

        # don't test for inference log_posterior(param) = fn since they won't
        # because of the way the 'best' params are picked

        inference = self.inference_mixin.inference
        self.assertTrue(inference.time_elapsed > 0)
        self.assertTrue(inference.number_of_function_evals > 0)


class TestInferenceMixinSingleOutputOptimisationCovariate(TestCase):
    def setUp(self):
        # ensure we've got nothing in the cache
        cache._cache.flush_all()

        self.inference, log_likelihood, biomarker_type, \
            covariate_biomarker_type, _, _ = create_pd_inference()

        # set uniform prior on everything, except
        # we'll do a population prior on the first one
        for i, param in enumerate(log_likelihood.parameters.all()):
            if i == 0:
                # first param is sampled from a normal distribution with a mean
                # derived from subject body weight
                param.child.biomarker_type = covariate_biomarker_type
                param.child.time_independent_data = True
                param.child.form = LogLikelihood.Form.NORMAL
                param.child.save()
                body_weight_values, _, subjects = param.child.get_data()
                param.length = len(subjects)
                param.save()

                # use a covariate to adjust the mean of the normal according to
                # body weight
                mean, sigma = param.child.get_noise_log_likelihoods()
                mean.form = LogLikelihood.Form.EQUATION
                mean.description = '1.0 if arg0 < 20 else 2.0'

                mean.biomarker_type = covariate_biomarker_type
                mean.time_independent_data = True
                mean.save()
                body_weight = LogLikelihood.objects.create(
                    name='Body weight',
                    inference=self.inference,
                    form=LogLikelihood.Form.FIXED,
                    biomarker_type=covariate_biomarker_type,
                    time_independent_data=True,
                )
                LogLikelihoodParameter.objects.create(
                    name='Body weight',
                    parent=mean,
                    child=body_weight,
                    parent_index=0,
                    length=len(subjects)
                )
                sigma.value = 0.01
                sigma.save()
            else:
                param.set_uniform_prior(0.0, 2.0)

        # 'run' inference to create copies of models
        self.inference.run_inference(test=True)

        # create mixin object
        self.inference_mixin = InferenceMixin(self.inference)

    def test_inference_runs(self):
        # tests that inference runs and writes results to db
        self.inference_mixin.run_inference()

        chains = self.inference_mixin.inference.chains.all()
        self.assertEqual(len(chains), 3)
        priors = self.inference_mixin._priors
        for chain in chains:
            fun_res = chain.inference_function_results
            f_vals = fun_res.order_by('iteration').values_list(
                'value', flat=True
            )
            self.assertEqual(len(f_vals), 11)
            for prior in priors:
                res = chain.inference_results.filter(log_likelihood=prior)
                p_vals = res.order_by('iteration').values_list(
                    'value', flat=True
                )
                length = prior.get_total_length()
                self.assertEqual(len(p_vals), 11 * length)

        # don't test for inference log_posterior(param) = fn since they won't
        # because of the way the 'best' params are picked

        inference = self.inference_mixin.inference
        self.assertTrue(inference.time_elapsed > 0)
        self.assertTrue(inference.number_of_function_evals > 0)
