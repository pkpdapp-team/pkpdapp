#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.test import TestCase
from pkpdapp.models import (
    Inference, PharmacodynamicModel, LogLikelihood,
    Project, BiomarkerType, Algorithm,
    InferenceResult, InferenceMixin,
    InferenceFunctionResult
)
import numpy as np


class TestInferenceSerializer(TestCase):
    def setUp(self):
        project = Project.objects.get(
            name='demo',
        )
        biomarker_type = BiomarkerType.objects.get(
            name='Tumour volume',
            dataset__name='lxf_control_growth'
        )
        self.model = PharmacodynamicModel.objects.get(
            name='tumour_growth_inhibition_model_koch',
            read_only=False,
        )
        self.inference = Inference.objects.create(
            name='bob',
            project=project,
            max_number_of_iterations=10,
            algorithm=Algorithm.objects.get(name='PSO'),
        )
        log_likelihood = LogLikelihood.objects.create(
            variable=self.model.variables.first(),
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
                output.parent.observed = True
                output.parent.save()
                outputs.append(output.parent)
            else:
                for param in output.parent.parameters.all():
                    if param != output:
                        param.child.delete()
                output.parent.delete()

        # set uniform prior on first param, except amounts
        self.param = log_likelihood.parameters.first()
        self.param.set_uniform_prior(0.0, 2.0)

    def test_run_inference(self):
        self.inference.run_inference(test=True)
        self.assertEqual(self.inference.name, 'bob')
        self.assertEqual(self.inference.log_likelihoods.count(), 10)

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
