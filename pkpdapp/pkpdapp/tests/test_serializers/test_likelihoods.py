#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import pkpdapp.tests  # noqa: F401
from django.test import TestCase
from pkpdapp.models import (
    PharmacodynamicModel, LogLikelihood,
    Project, BiomarkerType,
    Inference,
)
from pkpdapp.api.serializers import (
    LogLikelihoodSerializer
)


class TestLoglikelihoodSerializer(TestCase):
    def setUp(self):
        project = Project.objects.get(
            name='demo',
        )
        self.biomarker_type = BiomarkerType.objects.get(
            name='Tumour volume',
            dataset__name='lxf_control_growth'
        )
        self.model = PharmacodynamicModel.objects.get(
            name='tumour_growth_inhibition_model_koch',
        )
        self.inference = Inference.objects.create(
            project=project,
        )
        self.log_likelihood = LogLikelihood.objects.create(
            inference=self.inference,
            variable=self.model.variables.first(),
            biomarker_type=self.biomarker_type,
            form=LogLikelihood.Form.MODEL
        )
        self.parameters = self.log_likelihood.parameters.all()
        self.prior = self.parameters[0].child

    def test_serialize(self):
        serializer = LogLikelihoodSerializer(
            self.inference.log_likelihoods.all(),
            many=True
        )
        data = serializer.data
        self.assertEqual(len(data), 8)

    def test_update(self):
        serializer = LogLikelihoodSerializer(self.prior)
        data = serializer.data
        print(data)

        # update fixed value of 1st param
        data['form'] = 'N'

        validated_data = serializer.to_internal_value(data)
        serializer.update(self.prior, validated_data)
        self.assertEqual(self.prior.parameters.count(), 2)
