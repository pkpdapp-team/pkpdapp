#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import status
from rest_framework.test import APITestCase, APIClient
from django.contrib.auth.models import User
from pkpdapp.models import (
    CombinedModel,
    Compound,
    Distribution,
    PharmacodynamicModel,
    PharmacokineticModel,
    Project,
    ProjectAccess,
)


class CorrelationTestCase(APITestCase):
    def setUp(self):
        self.compound = Compound.objects.create(name="demo", compound_type="LM")
        self.project = Project.objects.create(
            name="test project", compound=self.compound
        )
        pd = PharmacodynamicModel.objects.get(name="tumour_growth_gompertz")
        pk = PharmacokineticModel.objects.get(name="one_compartment_clinical")
        self.model = CombinedModel.objects.create(
            pd_model=pd, pk_model=pk, project=self.project
        )
        variables = list(
            self.model.variables.filter(constant=True).order_by("id")[:2]
        )
        self.dist_1 = Distribution.objects.create(
            variable=variables[0], variance=0.1
        )
        self.dist_2 = Distribution.objects.create(
            variable=variables[1], variance=0.2
        )

        self.user = User.objects.create_user(username="testuser", password="12345")
        ProjectAccess.objects.create(user=self.user, project=self.project)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_create_list_and_delete(self):
        response = self.client.post(
            "/api/correlation/",
            {
                "distribution_1": self.dist_1.id,
                "distribution_2": self.dist_2.id,
                "coefficient": 0.5,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        correlation_id = response.data["id"]

        response = self.client.get(
            "/api/correlation/?dosed_pk_model_id={}".format(self.model.id)
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["coefficient"], 0.5)

        response = self.client.delete(
            "/api/correlation/{}/".format(correlation_id)
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_coefficient_out_of_range_rejected(self):
        response = self.client.post(
            "/api/correlation/",
            {
                "distribution_1": self.dist_1.id,
                "distribution_2": self.dist_2.id,
                "coefficient": 2.0,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
