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

from pkpdapp.models import Biomarker, BiomarkerType, Unit
from pkpdapp.tests.optimise_fixtures import (
    DOSE_SPECS,
    SELECTED_TIMES,
    TRUE_K,
    TRUE_SCALE,
    create_exponential_data,
    exponential_response,
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

    @staticmethod
    def _sigma_fields(n=1):
        """Default linear sigma request fields (now required by the API)."""
        return {
            "sigma_start": [1.0] * n,
            "sigma_bounds": [[0.0, 10.0] for _ in range(n)],
            "sigma_use_log_space": [True] * n,
        }

    def test_optimise_returns_ok(self):
        data = {
            "inputs": [self.k_var.id, self.scale_var.id],
            "starting": [0.27, 1.45],
            "bounds": [[0.16, 1.2], [0.3, 2.1]],
            "biomarker_types": [self.biomarker_type.id],
            "subject_groups": [g.id for g in self.groups],
            "max_iterations": 80,
            **self._sigma_fields(),
        }
        response = self._post_optimise(data)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("optimal", response.data)
        self.assertIn("loss", response.data)
        self.assertIn("reason", response.data)
        self.assertEqual(len(response.data["optimal"]), 2)
        self.assertTrue(np.isfinite(response.data["loss"]))

        # Observed data (DV) is returned for the observed-vs-predicted plot,
        # one entry per group aligned with the residuals.
        self.assertIn("observations", response.data)
        self.assertIsNotNone(response.data["observations"])
        self.assertEqual(
            len(response.data["observations"]), len(response.data["residuals"])
        )
        output_var_id = str(self.biomarker_type.variable.id)
        self.assertIn(output_var_id, response.data["observations"][0])
        self.assertEqual(
            len(response.data["observations"][0][output_var_id]),
            len(response.data["residuals"][0][output_var_id]),
        )

    def test_optimise_result_close_to_true(self):
        data = {
            "inputs": [self.k_var.id, self.scale_var.id],
            "starting": [0.27, 1.45],
            "bounds": [[0.16, 1.2], [0.3, 2.1]],
            "biomarker_types": [self.biomarker_type.id],
            "subject_groups": [g.id for g in self.groups],
            "max_iterations": 80,
            **self._sigma_fields(),
        }
        response = self._post_optimise(data)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        optimal = response.data["optimal"]
        self.assertAlmostEqual(optimal[0], TRUE_K, delta=0.04)
        self.assertAlmostEqual(optimal[1], TRUE_SCALE, delta=0.18)

    def test_optimise_returns_per_output_sigma(self):
        data = {
            "inputs": [self.k_var.id, self.scale_var.id],
            "starting": [0.27, 1.45],
            "bounds": [[0.16, 1.2], [0.3, 2.1]],
            "biomarker_types": [self.biomarker_type.id],
            "subject_groups": [g.id for g in self.groups],
            "max_iterations": 25,
            **self._sigma_fields(),
        }
        response = self._post_optimise(data)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_var_id = self.biomarker_type.variable.id
        self.assertEqual(response.data["sigma_variables"], [response_var_id])
        self.assertEqual(len(response.data["sigma"]), 1)
        self.assertEqual(len(response.data["sigma_start"]), 1)
        self.assertEqual(len(response.data["sigma_use_log_space"]), 1)
        self.assertEqual(len(response.data["sigma_bounds"]), 1)
        self.assertEqual(len(response.data["sigma_bounds"][0]), 2)

    def test_optimise_accepts_explicit_per_variable_sigma(self):
        response_var_id = self.biomarker_type.variable.id
        data = {
            "inputs": [self.k_var.id, self.scale_var.id],
            "starting": [0.27, 1.45],
            "bounds": [[0.16, 1.2], [0.3, 2.1]],
            "biomarker_types": [self.biomarker_type.id],
            "subject_groups": [g.id for g in self.groups],
            "max_iterations": 25,
            # linear sigma start / bounds + log-space flag
            "sigma_start": [1.0],
            "sigma_bounds": [[0.0, 10.0]],
            "sigma_use_log_space": [True],
        }
        response = self._post_optimise(data)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # sigma_variables is echoed back in the response (canonical order),
        # derived from biomarker_types — it is not part of the request.
        self.assertEqual(response.data["sigma_variables"], [response_var_id])
        self.assertEqual(response.data["sigma_start"], [1.0])
        self.assertEqual(response.data["sigma_bounds"], [[0.0, 10.0]])
        self.assertEqual(response.data["sigma_use_log_space"], [True])

    def test_optimise_accepts_linear_sigma(self):
        # sigma_use_log_space=False fits the noise sd in linear space.
        data = {
            "inputs": [self.k_var.id, self.scale_var.id],
            "starting": [0.27, 1.45],
            "bounds": [[0.16, 1.2], [0.3, 2.1]],
            "biomarker_types": [self.biomarker_type.id],
            "subject_groups": [g.id for g in self.groups],
            "max_iterations": 25,
            "sigma_start": [1.0],
            "sigma_bounds": [[0.0, 10.0]],
            "sigma_use_log_space": [False],
        }
        response = self._post_optimise(data)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["sigma_use_log_space"], [False])
        self.assertTrue(np.isfinite(response.data["loss"]))
        self.assertTrue(all(s > 0 for s in response.data["sigma"]))

    def test_optimise_combined_noise_returns_second_sigma(self):
        response_var_id = self.biomarker_type.variable.id
        data = {
            "inputs": [self.k_var.id, self.scale_var.id],
            "starting": [0.27, 1.45],
            "bounds": [[0.16, 1.2], [0.3, 2.1]],
            "biomarker_types": [self.biomarker_type.id],
            "subject_groups": [g.id for g in self.groups],
            "max_iterations": 25,
            "noise_models": ["combined"],
            "sigma_start": [1.0],
            "sigma_bounds": [[0.0, 10.0]],
            "sigma_use_log_space": [True],
            "sigma_mult_start": [0.1],
            "sigma_bounds_mult": [[0.0, 1.0]],
            "sigma_mult_use_log_space": [True],
        }
        response = self._post_optimise(data)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["noise_models"], ["combined"])
        self.assertEqual(response.data["sigma_variables"], [response_var_id])
        self.assertEqual(len(response.data["sigma"]), 1)
        self.assertEqual(len(response.data["sigma_mult"]), 1)
        self.assertEqual(response.data["sigma_mult_start"], [0.1])
        self.assertEqual(response.data["sigma_bounds_mult"], [[0.0, 1.0]])

    def test_optimise_mixed_noise_models(self):
        # Add a second output variable (Central.amount) with observations so two
        # biomarker types can use different noise models in one fit.
        amount = self.model.variables.get(qname="Central.amount")
        unit_mg = Unit.objects.get(symbol="mg")
        amount_type = BiomarkerType.objects.create(
            name="amount view",
            dataset=self.biomarker_type.dataset,
            stored_unit=unit_mg,
            display_unit=unit_mg,
            stored_time_unit=self.biomarker_type.stored_time_unit,
            display_time_unit=self.biomarker_type.display_time_unit,
            variable=amount,
        )
        for group, doses in zip(self.groups, DOSE_SPECS):
            subject = group.subjects.first()
            amounts = exponential_response(SELECTED_TIMES, doses, TRUE_K, 1.0)
            for t, value in zip(SELECTED_TIMES, amounts):
                Biomarker.objects.create(
                    time=float(t),
                    subject=subject,
                    biomarker_type=amount_type,
                    value=float(max(value, 1e-6)),
                )

        # noise_models / sigma arrays are in canonical (ascending variable id)
        # order: additive for the first output variable, combined for the second.
        var_ids = sorted([self.biomarker_type.variable.id, amount.id])
        noise_models = ["additive", "combined"]
        data = {
            "inputs": [self.k_var.id, self.scale_var.id],
            "starting": [0.27, 1.45],
            "bounds": [[0.16, 1.2], [0.3, 2.1]],
            "biomarker_types": [self.biomarker_type.id, amount_type.id],
            "subject_groups": [g.id for g in self.groups],
            "max_iterations": 20,
            "noise_models": noise_models,
            "sigma_start": [1.0, 1.0],
            "sigma_bounds": [[0.0, 10.0], [0.0, 10.0]],
            "sigma_use_log_space": [True, True],
            "sigma_mult_start": [0.1, 0.1],
            "sigma_bounds_mult": [[0.0, 1.0], [0.0, 1.0]],
            "sigma_mult_use_log_space": [True, True],
        }
        response = self._post_optimise(data)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["sigma_variables"], var_ids)
        self.assertEqual(response.data["noise_models"], noise_models)
        self.assertEqual(len(response.data["sigma"]), 2)
        # sigma_mult is per-output: None for the additive output, a float for the
        # combined one.
        self.assertIsNone(response.data["sigma_mult"][0])
        self.assertIsInstance(response.data["sigma_mult"][1], float)
        self.assertIsNone(response.data["sigma_mult_start"][0])
        self.assertEqual(response.data["sigma_mult_start"][1], 0.1)

    def test_optimise_400_for_invalid_noise_model(self):
        data = {
            "inputs": [self.k_var.id, self.scale_var.id],
            "starting": [0.27, 1.45],
            "bounds": [[0.16, 1.2], [0.3, 2.1]],
            "biomarker_types": [self.biomarker_type.id],
            "subject_groups": [g.id for g in self.groups],
            "noise_models": ["not-a-model"],
        }
        response = self._post_optimise(data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

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
            **self._sigma_fields(),
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
            **self._sigma_fields(),
        }
        response = self._post_optimise(data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_optimise_accepts_use_log_space(self):
        data = {
            "inputs": [self.k_var.id, self.scale_var.id],
            "starting": [0.27, 1.45],
            "bounds": [[0.16, 1.2], [0.3, 2.1]],
            "use_log_space": [True, False],
            "biomarker_types": [self.biomarker_type.id],
            "subject_groups": [g.id for g in self.groups],
            "max_iterations": 80,
            **self._sigma_fields(),
        }
        response = self._post_optimise(data)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(np.isfinite(response.data["loss"]))
        # optimal is reported in linear space regardless of parameterisation
        self.assertAlmostEqual(response.data["optimal"][0], TRUE_K, delta=0.04)
        self.assertAlmostEqual(response.data["optimal"][1], TRUE_SCALE, delta=0.18)

    def test_optimise_400_for_log_space_with_negative_lower_bound(self):
        data = {
            "inputs": [self.k_var.id, self.scale_var.id],
            "starting": [0.27, 1.45],
            "bounds": [[-0.1, 1.2], [0.3, 2.1]],
            "use_log_space": [True, False],
            "biomarker_types": [self.biomarker_type.id],
            "subject_groups": [g.id for g in self.groups],
            "max_iterations": 1,
            **self._sigma_fields(),
        }
        response = self._post_optimise(data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_optimise_400_when_sigma_omitted(self):
        # noise parameters are now required by the optimise method.
        data = {
            "inputs": [self.k_var.id, self.scale_var.id],
            "starting": [0.27, 1.45],
            "bounds": [[0.16, 1.2], [0.3, 2.1]],
            "biomarker_types": [self.biomarker_type.id],
            "subject_groups": [g.id for g in self.groups],
            "max_iterations": 1,
        }
        response = self._post_optimise(data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)
