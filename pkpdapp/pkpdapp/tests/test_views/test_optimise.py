#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import numpy as np
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from pkpdapp.tests.optimise_fixtures import (
    TRUE_K,
    TRUE_SCALE,
    create_exponential_data,
)


class TestOptimiseView(APITestCase):
    def setUp(self):
        setup = create_exponential_data(
            name_prefix="optimise view",
            group_name_prefix="View",
            rng_seed=99999,
        )
        self.model = setup["model"]
        self.biomarker_type = setup["biomarker_type"]
        self.groups = setup["groups"]
        self.k_var = self.model.variables.get(qname="Central.k")
        self.scale_var = self.model.variables.get(qname="Central.scale")

        self.user = User.objects.create_user(
            username="optimise_testuser", password="12345"
        )
        self.model.project.users.add(self.user)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def _post_optimise(self, data, pk=None):
        if pk is None:
            pk = self.model.pk
        url = reverse("optimise-combined-model", args=(pk,))
        return self.client.post(url, data, format="json")

    def test_optimise_returns_ok(self):
        data = {
            "inputs": [self.k_var.id, self.scale_var.id],
            "starting": [0.27, 1.45],
            "bounds": [[0.16, 1.2], [0.3, 2.1]],
            "biomarker_types": [self.biomarker_type.id],
            "subject_groups": [g.id for g in self.groups],
            "max_iterations": 80,
        }
        response = self._post_optimise(data)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("optimal", response.data)
        self.assertIn("loss", response.data)
        self.assertIn("reason", response.data)
        self.assertEqual(len(response.data["optimal"]), 2)
        self.assertTrue(np.isfinite(response.data["loss"]))

    def test_optimise_result_close_to_true(self):
        data = {
            "inputs": [self.k_var.id, self.scale_var.id],
            "starting": [0.27, 1.45],
            "bounds": [[0.16, 1.2], [0.3, 2.1]],
            "biomarker_types": [self.biomarker_type.id],
            "subject_groups": [g.id for g in self.groups],
            "max_iterations": 80,
        }
        response = self._post_optimise(data)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        optimal = response.data["optimal"]
        self.assertAlmostEqual(optimal[0], TRUE_K, delta=0.04)
        self.assertAlmostEqual(optimal[1], TRUE_SCALE, delta=0.18)

    def test_optimise_404_for_unknown_model(self):
        data = {
            "inputs": [self.k_var.id, self.scale_var.id],
            "starting": [0.27, 1.45],
            "bounds": [[0.16, 1.2], [0.3, 2.1]],
        }
        response = self._post_optimise(data, pk=99999)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_optimise_400_for_invalid_payload(self):
        # missing required fields
        response = self._post_optimise({"inputs": [self.k_var.id]})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_optimise_accepts_single_input(self):
        data = {
            "inputs": [self.k_var.id],
            "starting": [0.27],
            "bounds": [[0.16], [0.3]],
            "biomarker_types": [self.biomarker_type.id],
            "subject_groups": [g.id for g in self.groups],
            "max_iterations": 25,
        }
        response = self._post_optimise(data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("optimal", response.data)
        self.assertEqual(len(response.data["optimal"]), 1)
        self.assertTrue(np.isfinite(response.data["loss"]))

    def test_optimise_400_for_invalid_bounds(self):
        # lower >= upper should be rejected
        data = {
            "inputs": [self.k_var.id, self.scale_var.id],
            "starting": [0.27, 1.45],
            "bounds": [[0.3, 1.0], [0.1, 2.0]],
            "biomarker_types": [self.biomarker_type.id],
            "subject_groups": [g.id for g in self.groups],
            "max_iterations": 1,
        }
        response = self._post_optimise(data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)
