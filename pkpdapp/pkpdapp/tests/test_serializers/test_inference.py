#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.test import TestCase
from pkpdapp.models import (
    Inference, PharmacodynamicModel, LogLikelihoodNormal,
    LogLikelihoodLogNormal, Project, BiomarkerType,
    PriorNormal, PriorUniform,
)
from pkpdapp.api.serializers import (
    InferenceSerializer
)


class TestObjectiveFunctionSerializer(TestCase):
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
        self.inference = Inference.objects.create(
            name='bob',
            pd_model=model,
            project=project,
        )
        LogLikelihoodNormal.objects.create(
            sd=1.0,
            variable=variables[0],
            inference=self.inference,
            biomarker_type=biomarker_type
        )
        LogLikelihoodLogNormal.objects.create(
            sigma=2.0,
            variable=variables[1],
            inference=self.inference,
            biomarker_type=biomarker_type
        )
        PriorNormal.objects.create(
            mean=1.0,
            sd=1.0,
            variable=variables[0],
            inference=self.inference,
        )
        PriorUniform.objects.create(
            lower=1.0,
            upper=2.0,
            variable=variables[0],
            inference=self.inference,
        )

    def test_create(self):
        serializer = InferenceSerializer()
        data = {
            'name': 'test',
            'priors': [
                {
                    'type': 'PriorNormal',
                    'mean': 2.0,
                    'sd': 2.0,
                    'variable': self.inference.priors.first().variable.id,
                },
            ],
            'objective_functions': [],
            'project': self.inference.project.id,
        }
        validated_data = serializer.to_internal_value(data)
        new_inference = serializer.create(validated_data)
        self.assertEqual(new_inference.name, 'test')
        self.assertEqual(len(new_inference.objective_functions.all()), 0)
        self.assertEqual(len(new_inference.priors.all()), 1)

    def test_update(self):
        serializer = InferenceSerializer(
            self.inference
        )
        data = serializer.data
        data['name'] = 'fred'
        if data['priors'][0]['type'] == 'PriorNormal':
            index = 0
        else:
            index = 1
        data['priors'][index]['mean'] = 3.0
        data['objective_functions'].append({
            'type': 'LogLikelihoodNormal',
            'sd': 2.0,
            'variable': self.inference.objective_functions.first().variable.id,
            'biomarker_type': (
                self.inference.objective_functions.first().biomarker_type.id
            ),
        })
        validated_data = serializer.to_internal_value(data)
        serializer.update(self.inference, validated_data)
        self.assertEqual(self.inference.name, 'fred')
        new_priors = list(self.inference.priors.all())
        self.assertEqual(new_priors[index].mean, 3.0)
        self.assertEqual(len(self.inference.priors.all()), 2)
        self.assertEqual(len(self.inference.objective_functions.all()), 3)
