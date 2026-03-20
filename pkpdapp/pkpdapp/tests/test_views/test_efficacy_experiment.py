#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import pkpdapp.tests  # noqa: F401

from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from pkpdapp.models import Compound, EfficacyExperiment, Project, ProjectAccess, Unit


class EfficacyExperimentViewTestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", password="12345")
        self.other_user = User.objects.create_user(
            username="otheruser", password="12345"
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.unit = Unit.objects.get(symbol="nmol/L")

        self.allowed_compound = Compound.objects.create(name="allowed")
        self.allowed_project = Project.objects.create(
            name="allowed project",
            compound=self.allowed_compound,
        )
        ProjectAccess.objects.create(user=self.user, project=self.allowed_project)

        self.blocked_compound = Compound.objects.create(name="blocked")
        self.blocked_project = Project.objects.create(
            name="blocked project",
            compound=self.blocked_compound,
        )
        ProjectAccess.objects.create(user=self.other_user, project=self.blocked_project)

        self.allowed_experiment = EfficacyExperiment.objects.create(
            name="allowed exp",
            c50=1.0,
            c50_unit=self.unit,
            hill_coefficient=1.0,
            compound=self.allowed_compound,
        )
        self.blocked_experiment = EfficacyExperiment.objects.create(
            name="blocked exp",
            c50=2.0,
            c50_unit=self.unit,
            hill_coefficient=1.0,
            compound=self.blocked_compound,
        )

    def test_list_only_returns_accessible_projects(self):
        response = self.client.get("/api/efficacy_experiment/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.allowed_experiment.id)

    def test_compound_filter_cannot_access_other_projects(self):
        response = self.client.get(
            f"/api/efficacy_experiment/?compound_id={self.blocked_compound.id}"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_invalid_compound_id_returns_bad_request(self):
        response = self.client.get("/api/efficacy_experiment/?compound_id=abc")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Must be an integer.", str(response.data["compound_id"]))
