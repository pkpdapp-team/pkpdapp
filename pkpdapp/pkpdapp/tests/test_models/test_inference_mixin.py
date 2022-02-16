#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.test import TestCase
import numpy as np
from pkpdapp.models import (
    Inference, PharmacodynamicModel,
    LogLikelihood,
    Project, BiomarkerType,
    PriorUniform, MyokitForwardModel,
    InferenceMixin, Algorithm, InferenceChain, InferenceResult,
    InferenceFunctionResult,
)
from django.core.cache import cache


class TestInferenceMixinSingleOutputSampling(TestCase):
    def setUp(self):
        # ensure we've got nothing in the cache
        cache._cache.flush_all()

        project = Project.objects.get(
            name='demo',
        )
        biomarker_type = BiomarkerType.objects.get(
            name='Tumour volume',
            dataset__name='lxf_control_growth'
        )
        model = PharmacodynamicModel.objects.get(
            name='tumour_growth_inhibition_model_koch',
            read_only=False,
        )
        variables = model.variables.all()
        var_names = [v.qname for v in variables]
        m = model.get_myokit_model()
        s = model.get_myokit_simulator()

        forward_model = MyokitForwardModel(
            myokit_model=m,
            myokit_simulator=s,
            outputs="myokit.tumour_volume")

        output_names = forward_model.output_names()
        var_index = var_names.index(output_names[0])

        self.inference = Inference.objects.create(
            name='bob',
            pd_model=model,
            project=project,
            max_number_of_iterations=10,
            algorithm=Algorithm.objects.get(name='Haario-Bardenet'),
        )
        LogLikelihood.objects.create(
            variable=variables[var_index],
            inference=self.inference,
            biomarker_type=biomarker_type,
            form=LogLikelihood.Form.NORMAL
        )

        # find variables that are being estimated
        parameter_names = forward_model.variable_parameter_names()
        var_indices = [var_names.index(v) for v in parameter_names]
        for i in var_indices:
            PriorUniform.objects.create(
                lower=0.0,
                upper=2.0,
                variable=variables[i],
                inference=self.inference,
            )
        # 'run' inference to create copies of models
        self.inference = self.inference.run_inference(test=True)

        # create mixin object
        self.inference_mixin = InferenceMixin(self.inference)

    def test_objective_functions(self):
        # Test that log-likelihood, log-prior and log-posterior work

        # Test log-likelihood
        log_likelihood = self.inference_mixin._pints_log_likelihood
        val = log_likelihood([1, 1, 1, 1, 1])
        self.assertAlmostEqual(val, -113.33099855566624, delta=0.1)
        val = log_likelihood([1, 2, 3, 4, 5])
        self.assertAlmostEqual(val, -121.32407882599529, delta=0.1)

        # Test log-prior
        log_prior = self.inference_mixin._pints_composed_log_prior
        val = log_prior([1, 1, 1, 1, 1])
        self.assertAlmostEqual(val, -3.4657359027997265, delta=0.1)
        val = log_prior([3, 1, 1, 1, 1])
        self.assertEqual(val, -np.inf)

        # Test log-posterior
        log_posterior = self.inference_mixin._pints_log_posterior
        val = log_posterior([1, 1, 1, 1, 1])
        self.assertAlmostEqual(val, -116.79673445846596, delta=0.1)
        val = log_posterior([1.3, 0.5, 1.1, 0.9, 1.2])
        self.assertAlmostEqual(val, -149.2582993033948, delta=0.1)

        val = log_posterior([1, 3, 1, 1, 1])
        self.assertEqual(val, -np.inf)

    def test_inference_runs(self):
        # tests that inference runs and writes results to db
        self.inference_mixin.run_inference()

        chains = self.inference_mixin.inference.chains.all()
        self.assertEqual(len(chains), 4)
        for chain in chains:
            priors = self.inference_mixin.priors
            fun_res = chain.inference_function_results
            f_vals = fun_res.order_by('iteration').values_list(
                'value', flat=True
            )
            self.assertEqual(len(f_vals), 11)
            p_vals_all = []
            for prior in priors:
                res = chain.inference_results.filter(prior=prior)
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
            lookup = self.inference_mixin._django_to_pints_lookup
            for idx, params in enumerate(p_vals_all):
                params = [params[lookup[p.variable.qname]] for p in priors]
                self.assertTrue(abs(fn(params) - f_vals[idx]) < 0.01)
        inference = self.inference_mixin.inference
        self.assertTrue(inference.time_elapsed > 0)
        self.assertTrue(inference.number_of_function_evals > 0)


class TestInferenceMixinSingleOutputOptimisation(TestCase):
    def setUp(self):
        # ensure we've got nothing in the cache
        cache._cache.flush_all()
        project = Project.objects.get(
            name='demo',
        )
        biomarker_type = BiomarkerType.objects.get(
            name='Tumour volume',
            dataset__name='lxf_control_growth'
        )
        model = PharmacodynamicModel.objects.get(
            name='tumour_growth_inhibition_model_koch',
            read_only=False,
        )
        variables = model.variables.all()
        var_names = [v.qname for v in variables]
        m = model.get_myokit_model()
        s = model.get_myokit_simulator()

        forward_model = MyokitForwardModel(
            myokit_model=m,
            myokit_simulator=s,
            outputs="myokit.tumour_volume")

        output_names = forward_model.output_names()
        var_index = var_names.index(output_names[0])

        self.inference = Inference.objects.create(
            name='bob',
            pd_model=model,
            project=project,
            max_number_of_iterations=10,
            algorithm=Algorithm.objects.get(name='XNES'),
            number_of_chains=3,
        )
        LogLikelihood.objects.create(
            variable=variables[var_index],
            inference=self.inference,
            biomarker_type=biomarker_type,
            form=LogLikelihood.Form.NORMAL
        )

        # find variables that are being estimated
        parameter_names = forward_model.variable_parameter_names()
        var_indices = [var_names.index(v) for v in parameter_names]
        self.inference.priors.set([
            PriorUniform.objects.create(
                lower=0.0,
                upper=2.0,
                variable=variables[i],
                inference=self.inference,
            )
            for i in var_indices
        ])

        # 'run' inference to create copies of models
        self.inference.run_inference(test=True)

        # create mixin object
        self.inference_mixin = InferenceMixin(self.inference)

    def test_inference_runs(self):
        # tests that inference runs and writes results to db
        self.inference_mixin.run_inference()

        chains = self.inference_mixin.inference.chains.all()
        self.assertEqual(len(chains), 3)
        for chain in chains:
            priors = self.inference_mixin.priors
            fun_res = chain.inference_function_results
            f_vals = fun_res.order_by('iteration').values_list(
                'value', flat=True
            )
            self.assertEqual(len(f_vals), 11)
            p_vals_all = []
            for prior in priors:
                res = chain.inference_results.filter(prior=prior)
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
            for prior in self.inference.priors.all():
                chain.inference_results.add(
                    InferenceResult.objects.create(
                        chain=chain,
                        prior=prior,
                        iteration=0,
                        value=0.5,
                    ),
                    InferenceResult.objects.create(
                        chain=chain,
                        prior=prior,
                        iteration=1,
                        value=0.4,
                    )
                )
        self.inference.number_of_iterations = 1

        # tests that inference runs and writes results to db
        self.inference_mixin.run_inference()

        chains = self.inference_mixin.inference.chains.all()
        self.assertEqual(len(chains), 3)
        for chain in chains:
            priors = self.inference_mixin.priors
            fun_res = chain.inference_function_results
            f_vals = fun_res.order_by('iteration').values_list(
                'value', flat=True
            )
            self.assertEqual(len(f_vals), 11)
            p_vals_all = []
            for prior in priors:
                res = chain.inference_results.filter(prior=prior)
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
