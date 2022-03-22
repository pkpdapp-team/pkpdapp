#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.test import TestCase
from pkpdapp.models import (
    Inference, PharmacodynamicModel, LogLikelihood,
    Project, BiomarkerType,
    PriorNormal, PriorUniform,
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
            project=project,
            max_number_of_iterations=10,
            algorithm=Algorithm.objects.get(name='Haario-Bardenet'),
        )
        log_likelihood = LogLikelihood.objects.create(
            variable=variables[var_index],
            inference=self.inference,
            biomarker_type=biomarker_type,
            form=LogLikelihood.Form.NORMAL
        )

        # find variables that are being estimated
        parameter_names = forward_model.variable_parameter_names()
        var_indices = [var_names.index(v) for v in parameter_names]
        for i in var_indices:
            param = log_likelihood.parameters.get(
                variable=variables[i]
            )
            PriorUniform.objects.create(
                lower=0.0,
                upper=2.0,
                log_likelihood_parameter=param,
            )
        noise_param = log_likelihood.parameters.get(
            variable__isnull=True
        )
        PriorUniform.objects.create(
            lower=0.0,
            upper=2.0,
            log_likelihood_parameter=noise_param,
        )


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
        data['name'] = 'fred'
        data['log_likelihoods'].append({
            'form': 'N',
            'variable': self.inference.log_likelihoods.first().variable.id,
            'parameters': [],
            'biomarker_type': (
                self.inference.log_likelihoods.first().biomarker_type.id
            ),
        })
        validated_data = serializer.to_internal_value(data)
        serializer.update(self.inference, validated_data)
        self.assertEqual(self.inference.name, 'fred')
        self.assertEqual(len(self.inference.log_likelihoods.all()), 2)

    def test_inference_results(self):
        # 'run' inference to create copies of models
        self.inference.run_inference(test=True)

        # create mixin object
        inference_mixin = InferenceMixin(self.inference)
        inference_mixin.run_inference()

        chain = self.inference.chains.first()
        chain_serializer = InferenceChainSerializer(chain)
        print('data', chain_serializer.data)
