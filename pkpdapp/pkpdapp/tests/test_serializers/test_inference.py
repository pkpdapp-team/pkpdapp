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
    InferenceMixin, Algorithm
)
from pkpdapp.api.serializers import (
    InferenceSerializer, InferenceChainSerializer,
)


class TestInferenceSerializer(TestCase):
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
        print(data)
        self.assertTrue('outputs' in data)
        self.assertTrue('log_likelihoods' in data['outputs'])
        self.assertTrue('outputs' in data['outputs'])
        self.assertEqual(len(data['outputs']['outputs']), 1)
        self.assertEqual(len(data['outputs']['outputs'][0]['times']), 14)
