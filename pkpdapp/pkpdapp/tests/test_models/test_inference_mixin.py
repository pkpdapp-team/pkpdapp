#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.test import TestCase
import numpy as np
from pkpdapp.models import (
    Inference, PharmacodynamicModel,
    PharmacokineticModel, DosedPharmacokineticModel,
    Protocol, Unit,
    LogLikelihood,
    Project, BiomarkerType,
    InferenceMixin, Algorithm, InferenceChain, InferenceResult,
    InferenceFunctionResult,
)
from django.core.cache import cache


class TestInferenceMixinPkModel(TestCase):
    def setUp(self):
        # ensure we've got nothing in the cache
        cache._cache.flush_all()

        project = Project.objects.get(
            name='demo',
        )
        biomarker_type = BiomarkerType.objects.get(
            name='DemoDrug Concentration',
            dataset__name='usecase0'
        )
        biomarker_type.display_unit = Unit.objects.get(
            symbol='g/L'
        )
        biomarker_type.save()
        pk = PharmacokineticModel.objects\
            .get(name='three_compartment_pk_model')

        protocol = Protocol.objects.get(
            subjects__dataset=biomarker_type.dataset,
            subjects__id_in_dataset=1,
        )

        model = DosedPharmacokineticModel.objects.create(
            name='my wonderful model',
            pharmacokinetic_model=pk,
            dose_compartment='central',
            protocol=protocol,
        )

        self.inference = Inference.objects.create(
            name='bob',
            project=project,
            max_number_of_iterations=10,
            algorithm=Algorithm.objects.get(name='Haario-Bardenet'),
        )
        log_likelihood = LogLikelihood.objects.create(
            variable=model.variables.first(),
            inference=self.inference,
            form=LogLikelihood.Form.MODEL
        )

        # remove all outputs except
        output_names = [
            'central.drug_c_concentration',
        ]
        outputs = []
        for output in log_likelihood.outputs.all():
            if output.variable.qname in output_names:
                output.parent.biomarker_type = biomarker_type
                output.parent.save()
                outputs.append(output.parent)
            else:
                for param in output.parent.parameters.all():
                    if param != output:
                        param.child.delete()
                output.parent.delete()

        # set uniform prior on everything, except amounts
        for param in log_likelihood.parameters.all():
            if '_amount' in param.name:
                param.set_fixed(0)
            else:
                param.set_uniform_prior(0.0, 0.1)

        # 'run' inference to create copies of models
        self.inference.run_inference(test=True)

        # create mixin object
        self.inference_mixin = InferenceMixin(self.inference)

    def test_objective_functions(self):
        # Test log-posterior
        log_posterior = self.inference_mixin._pints_log_posterior
        log_posterior(
            log_posterior.to_search(
                [0.0065, 0.0063, 0.05, 0.0135, 0.0022, 0.0089, 0.004]
            )
        )


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
        self.inference = Inference.objects.create(
            name='bob',
            project=project,
            max_number_of_iterations=10,
            algorithm=Algorithm.objects.get(name='Haario-Bardenet'),
        )
        log_likelihood = LogLikelihood.objects.create(
            variable=model.variables.first(),
            inference=self.inference,
            form=LogLikelihood.Form.MODEL
        )

        # remove all outputs except
        output_names = [
            'myokit.tumour_volume',
        ]
        outputs = []
        for output in log_likelihood.outputs.all():
            if output.variable.qname in output_names:
                output.parent.biomarker_type = biomarker_type
                output.parent.save()
                outputs.append(output.parent)
            else:
                for param in output.parent.parameters.all():
                    if param != output:
                        param.child.delete()
                output.parent.delete()

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
        self.assertEqual(len(chains), 4)
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
                self.assertTrue(
                    abs(fn(fn.to_search(params)) - f_vals[idx]) < 0.01
                )

            output_res = chain.inference_output_results.all()
            self.assertTrue(len(output_res), 28)

        inference = self.inference_mixin.inference
        self.assertTrue(inference.time_elapsed > 0)
        self.assertTrue(inference.number_of_function_evals > 0)


class TestInferenceMixinSingleOutputOptimisation(TestCase):
    def setUp(self):
        # ensure we've got nothing in the cache
        cache._cache.flush_all()

        self.project = Project.objects.get(
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
        self.inference = Inference.objects.create(
            name='bob',
            project=self.project,
            max_number_of_iterations=10,
            algorithm=Algorithm.objects.get(name='XNES'),
            number_of_chains=3,
        )
        log_likelihood = LogLikelihood.objects.create(
            variable=model.variables.first(),
            inference=self.inference,
            form=LogLikelihood.Form.MODEL
        )

        # remove all outputs except
        output_names = [
            'myokit.tumour_volume',
        ]
        outputs = []
        for output in log_likelihood.outputs.all():
            if output.variable.qname in output_names:
                output.parent.biomarker_type = biomarker_type
                output.parent.save()
                outputs.append(output.parent)
            else:
                for param in output.parent.parameters.all():
                    if param != output:
                        param.child.delete()
                output.parent.delete()
        self.outputs = outputs

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


class TestInferenceMixinFakeData(TestCase):
    def setUp(self):
        # ensure we've got nothing in the cache
        cache._cache.flush_all()
        project = Project.objects.get(
            name='demo',
        )
        model = PharmacodynamicModel.objects.get(
            name='tumour_growth_inhibition_model_koch',
            read_only=False,
        )
        self.inference = Inference.objects.create(
            name='bob',
            project=project,
            max_number_of_iterations=10,
            algorithm=Algorithm.objects.get(name='Haario-Bardenet'),
        )
        log_likelihood = LogLikelihood.objects.create(
            variable=model.variables.first(),
            inference=self.inference,
            form=LogLikelihood.Form.MODEL
        )

        # remove all outputs except
        output_names = [
            'myokit.tumour_volume',
        ]
        outputs = []
        for output in log_likelihood.outputs.all():
            if output.variable.qname in output_names:
                output.parent.biomarker_type = None
                output.parent.save()
                outputs.append(output.parent)
            else:
                for param in output.parent.parameters.all():
                    if param != output:
                        param.child.delete()
                output.parent.delete()

        # set uniform prior on everything, except amounts
        for param in log_likelihood.parameters.all():
            param.set_uniform_prior(0.0, 2.0)

        # 'run' inference to create copies of models
        self.inference.run_inference(test=True)

    def test_inference_fails(self):
        with self.assertRaisesRegex(
            RuntimeError,
            "must have at least one observed random variable"
        ):
            InferenceMixin(self.inference)
