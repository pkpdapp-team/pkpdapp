#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.test import TestCase
import numpy as np
from pkpdapp.models import (
    Inference, PharmacodynamicModel,
    PharmacokineticModel,
    LogLikelihoodNormal,
    LogLikelihoodLogNormal,
    Project, BiomarkerType,
    PriorUniform, MyokitForwardModel,
    InferenceMixin
)


class TestInferenceMixinSingleOutput(TestCase):
    def setUp(self):
        project = Project.objects.get(
            name='demo',
        )
        biomarker_type = BiomarkerType.objects.get(
            name='Tumour volume',
            dataset__name='lxf_control_growth'
        )
        model = PharmacodynamicModel.objects.get(
            name='tumour_growth_inhibition_model_koch',
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
        )
        LogLikelihoodNormal.objects.create(
            sd=1.0,
            variable=variables[var_index],
            inference=self.inference,
            biomarker_type=biomarker_type
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
        self.inference = self.inference.run_inference()

        # create mixin object
        self.inference_mixin = InferenceMixin(self.inference)

    def test_objective_functions(self):
        # Test that log-likelihood, log-prior and log-posterior work

        # Test log-likelihood
        pints_forward_model = self.inference_mixin.create_pints_forward_model()
        problem_collection = self.inference_mixin.create_pints_problem_collection()
        log_likelihood = self.inference_mixin.create_pints_log_likelihood()
        val = log_likelihood([1, 1, 1, 1, 1])
        self.assertTrue(abs(val - -113.33099855566624) < 0.1)
        val = log_likelihood([1, 2, 3, 4, 5])
        self.assertTrue(abs(val - -121.32407882599529) < 0.1)

        # Test log-prior
        log_prior = self.inference_mixin.create_pints_log_prior()
        val = log_prior([1, 1, 1, 1, 1])
        self.assertTrue(abs(val - -3.4657359027997265) < 0.1)
        val = log_prior([3, 1, 1, 1, 1])
        self.assertEqual(val, -np.inf)

        # Test log-posterior
        log_posterior = self.inference_mixin.create_pints_log_posterior()
        val = log_posterior([1, 1, 1, 1, 1])
        self.assertTrue(abs(val - -116.79673445846596) < 0.1)
        val = log_posterior([1.3, 0.5, 1.1, 0.9, 1.2])
        self.assertTrue(abs(val - -149.2582993033948) < 0.1)
        val = log_posterior([1, 3, 1, 1, 1])
        self.assertEqual(val, -np.inf)


class TestInferenceMixinMultipleOutput(TestCase):
    def setUp(self):
        project = Project.objects.get(
            name='demo',
        )
        biomarker_type_1 = BiomarkerType.objects.get(
            name='Plasma concentration',
            dataset__name='lxf_single_erlotinib_dose'
        )
        # this is an odd variable to test on for a pk model but couldn't find
        # other suitable biomarkers
        biomarker_type_2 = BiomarkerType.objects.get(
            name='Body weight',
            dataset__name='lxf_single_erlotinib_dose'
        )
        m = PharmacokineticModel.objects.get(
            name='three_compartment_pk_model',
        )
        self.model = m.get_myokit_model()
        self.simulator = m.get_myokit_simulator()

        output_names = ["peripheral_1.drug_p1_amount",
                        "peripheral_2.drug_p2_amount"]
        forward_model = MyokitForwardModel(
            myokit_model=self.model,
            myokit_simulator=self.simulator,
            outputs=output_names)

        self.inference = Inference.objects.create(
            name='bob',
            pd_model=m,
            project=project,
        )

        variables = m.variables.all()
        var_names = [v.qname for v in variables]
        var_index_1 = var_names.index(output_names[0])
        var_index_2 = var_names.index(output_names[1])

        LogLikelihoodNormal.objects.create(
            sd=1.5,
            variable=variables[var_index_1],
            inference=self.inference,
            biomarker_type=biomarker_type_1
        )

        LogLikelihoodLogNormal.objects.create(
            sigma=1.5,
            variable=variables[var_index_2],
            inference=self.inference,
            biomarker_type=biomarker_type_2
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
        self.inference = self.inference.run_inference()

        # create mixin object
        self.inference_mixin = InferenceMixin(self.inference)

    def test_objective_functions(self):
        # Test that log-likelihood, log-prior and log-posterior work

        # Test log-likelihood
        pints_forward_model = self.inference_mixin.create_pints_forward_model()
        problem_collection = self.inference_mixin.create_pints_problem_collection()
        log_likelihood = self.inference_mixin.create_pints_log_likelihood()
        print(log_likelihood.n_parameters())
