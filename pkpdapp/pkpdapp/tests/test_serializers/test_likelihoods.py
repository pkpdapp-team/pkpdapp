#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.test import TestCase
from pkpdapp.models import (
    DraftInference, PharmacodynamicModel, LogLikelihoodNormal,
    LogLikelihoodLogNormal, Project
)
from pkpdapp.api.serializers import (
    ObjectiveFunctionSerializer
)
from django.utils import timezone
from django.db.utils import IntegrityError

class TestObjectiveFunctionSerializer(TestCase):
    def setUp(self):
        project = Project.objects.get(
            name='demo',
        )
        model = PharmacodynamicModel.objects.get(
            name='tumour_growth_inhibition_model_koch',
        )
        variables = model.variables.all()
        self.inference = DraftInference.objects.create(
            pd_model=model,
            project=project,
        )
        LogLikelihoodNormal.objects.create(
            sd=1.0,
            variable=variables[0],
            inference=self.inference
        )
        LogLikelihoodLogNormal.objects.create(
            sigma=2.0,
            variable=variables[1],
            inference=self.inference
        )

    def test_serialize(self):
        serializer = ObjectiveFunctionSerializer(
            self.inference.objectivefunctions
        )
        print(serializer.data)




