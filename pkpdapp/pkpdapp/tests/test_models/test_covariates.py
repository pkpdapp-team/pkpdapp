#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import numpy as np
from django.test import SimpleTestCase, TestCase

from pkpdapp.models import (
    CombinedModel,
    Covariate,
    DerivedVariable,
    PharmacokineticModel,
    Project,
    Compound,
    SubjectGroup,
    CovariatePopulation,
)
from pkpdapp.models.uncertainty_simulation_mixin import UncertaintySimulationMixin


class _SamplingHost(UncertaintySimulationMixin):
    """Bare host for the pure covariate sampling helpers (no DB needed)."""


class TestCovariateSamplingHelpers(SimpleTestCase):
    def setUp(self):
        self.host = _SamplingHost()

    def test_no_group_config_yields_neutral_values(self):
        specs = [
            {"cov_name": "WT", "kind": "weight", "input_id": 1,
             "covariate_id": None, "mu_id": 10},
            {"cov_name": "SEX", "kind": "sex", "input_id": 2,
             "covariate_id": None, "mu_id": None},
        ]
        rng = np.random.default_rng(0)
        values = self.host._sample_individual_covariates(specs, None, rng)
        self.assertEqual(values[1], 1.0)  # continuous -> 1 so WT/mu == 1
        self.assertEqual(values[2], 0.0)  # categorical -> base category
        mu = self.host._covariate_group_mu(specs, None)
        self.assertEqual(mu[10], 1.0)

    def test_weight_mu_is_m2f_weighted_region_median(self):
        from pkpdapp.utils.weight_populations import (
            FEMALE,
            MALE,
            reference_median_weight,
        )

        specs = [
            {"cov_name": "WT", "kind": "weight", "input_id": 1,
             "covariate_id": None, "mu_id": 10},
        ]
        config = {
            "study_size": 100, "region": "US", "age_min": None,
            "age_max": None, "m2f_ratio": 0.25, "populations": {},
        }
        mu = self.host._covariate_group_mu(specs, config)
        expected = 0.25 * reference_median_weight("US", MALE) + 0.75 * (
            reference_median_weight("US", FEMALE)
        )
        self.assertAlmostEqual(mu[10], expected)

    def test_custom_categorical_respects_probabilities(self):
        class _Pop:
            median = None
            variance = None
            category_probabilities = [0.0, 1.0, 0.0]

        specs = [
            {"cov_name": "eth", "kind": "custom_cat", "input_id": 5,
             "covariate_id": 42, "mu_id": None},
        ]
        config = {
            "study_size": 10, "region": None, "age_min": None,
            "age_max": None, "m2f_ratio": 0.5, "populations": {42: _Pop()},
        }
        rng = np.random.default_rng(1)
        # all probability mass on category 1
        for _ in range(20):
            values = self.host._sample_individual_covariates(specs, config, rng)
            self.assertEqual(values[5], 1.0)


class TestCovariateApi(TestCase):
    def setUp(self):
        from django.contrib.auth.models import User
        from rest_framework.test import APIClient
        from django.urls import reverse

        self.reverse = reverse
        self.user = User.objects.create_user(username="covuser", password="12345")
        compound = Compound.objects.create(name="demo")
        self.project = Project.objects.create(name="demo", compound=compound)
        self.project.users.add(self.user)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_covariate_crud_round_trip(self):
        url = self.reverse("covariate-list")
        response = self.client.post(
            url,
            data={
                "project": self.project.id,
                "name": "albumin",
                "type": Covariate.Type.CONTINUOUS,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        covariate_id = response.data["id"]

        # listing is scoped by project
        list_response = self.client.get(url, {"project_id": self.project.id})
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.data), 1)

        # categorical covariate requires >= 2 categories
        bad = self.client.post(
            url,
            data={
                "project": self.project.id,
                "name": "eth",
                "type": Covariate.Type.CATEGORICAL,
            },
            format="json",
        )
        self.assertEqual(bad.status_code, 400)
        return covariate_id

    def test_covariate_population_round_trip(self):
        covariate = Covariate.objects.create(
            project=self.project,
            name="albumin",
            type=Covariate.Type.CONTINUOUS,
        )
        group = SubjectGroup.objects.create(name="G1", project=self.project)
        url = self.reverse("covariate_population-list")
        response = self.client.post(
            url,
            data={
                "subject_group": group.id,
                "covariate": covariate.id,
                "median": 40.0,
                "variance": 0.04,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)

        # exposed nested (read-only) on the subject group
        group_url = self.reverse("subject_group-detail", args=(group.id,))
        group_response = self.client.get(group_url)
        self.assertEqual(group_response.status_code, 200)
        self.assertEqual(len(group_response.data["covariate_populations"]), 1)

    def test_categorical_population_length_validation(self):
        covariate = Covariate.objects.create(
            project=self.project,
            name="eth",
            type=Covariate.Type.CATEGORICAL,
            n_categories=3,
        )
        group = SubjectGroup.objects.create(name="G1", project=self.project)
        url = self.reverse("covariate_population-list")
        response = self.client.post(
            url,
            data={
                "subject_group": group.id,
                "covariate": covariate.id,
                "category_probabilities": [0.5, 0.5],  # wrong length
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)


class TestCovariateInjection(TestCase):
    def setUp(self):
        compound = Compound.objects.create(name="demo")
        self.project = Project.objects.create(name="demo", compound=compound)
        self.pk_model = PharmacokineticModel.objects.get(
            name="1-compartmental model"
        )
        self.pkpd_model = CombinedModel.objects.create(
            name="cov model",
            pk_model=self.pk_model,
            project=self.project,
        )

    def _cl_variable(self):
        return self.pkpd_model.variables.get(qname="PKCompartment.CL")

    def test_weight_covariate_injects_exponent_parameter(self):
        DerivedVariable.objects.create(
            pkpd_model=self.pkpd_model,
            pk_variable=self._cl_variable(),
            type=DerivedVariable.Type.WEIGHT_COVARIATE,
        )
        self.pkpd_model = CombinedModel.objects.get(pk=self.pkpd_model.pk)
        model = self.pkpd_model.get_myokit_model()
        model.validate()
        qnames = [v.qname() for v in model.variables()]
        self.assertIn("Covariates.WT", qnames)
        self.assertIn("Covariates.mu_WT", qnames)
        self.assertIn("Covariates.a_WT_PKCompartment_CL", qnames)
        self.assertIn("Covariates.PKCompartment_CL_cov", qnames)

        # CL is clearance [L/h] so the default exponent should be 0.75
        a_var = self.pkpd_model.variables.get(
            qname="Covariates.a_WT_PKCompartment_CL"
        )
        self.assertAlmostEqual(a_var.get_default_value(), 0.75)

        # the adjusted value multiplies CL by (WT/mu_WT)^a
        adj = model.get("Covariates.PKCompartment_CL_cov")
        self.assertIn("PKCompartment.CL", str(adj.rhs()))
        self.assertIn("Covariates.WT", str(adj.rhs()))

    def test_sex_covariate_injects_single_delta(self):
        DerivedVariable.objects.create(
            pkpd_model=self.pkpd_model,
            pk_variable=self._cl_variable(),
            type=DerivedVariable.Type.SEX_COVARIATE,
        )
        self.pkpd_model = CombinedModel.objects.get(pk=self.pkpd_model.pk)
        model = self.pkpd_model.get_myokit_model()
        model.validate()
        qnames = [v.qname() for v in model.variables()]
        self.assertIn("Covariates.SEX", qnames)
        self.assertIn("Covariates.d_SEX_PKCompartment_CL_1", qnames)
        # only one delta for two categories
        self.assertNotIn("Covariates.d_SEX_PKCompartment_CL_2", qnames)

    def test_custom_categorical_injects_delta_per_category(self):
        cov = Covariate.objects.create(
            project=self.project,
            name="ethnicity",
            type=Covariate.Type.CATEGORICAL,
            n_categories=3,
        )
        DerivedVariable.objects.create(
            pkpd_model=self.pkpd_model,
            pk_variable=self._cl_variable(),
            covariate=cov,
            type=DerivedVariable.Type.CUSTOM_CAT_COVARIATE,
        )
        self.pkpd_model = CombinedModel.objects.get(pk=self.pkpd_model.pk)
        model = self.pkpd_model.get_myokit_model()
        model.validate()
        qnames = [v.qname() for v in model.variables()]
        self.assertIn("Covariates.ethnicity", qnames)
        self.assertIn("Covariates.d_ethnicity_PKCompartment_CL_1", qnames)
        self.assertIn("Covariates.d_ethnicity_PKCompartment_CL_2", qnames)

    def test_two_covariates_share_input_and_compose(self):
        cl = self._cl_variable()
        v1 = self.pkpd_model.variables.get(qname="PKCompartment.V1")
        DerivedVariable.objects.create(
            pkpd_model=self.pkpd_model,
            pk_variable=cl,
            type=DerivedVariable.Type.WEIGHT_COVARIATE,
        )
        DerivedVariable.objects.create(
            pkpd_model=self.pkpd_model,
            pk_variable=v1,
            type=DerivedVariable.Type.WEIGHT_COVARIATE,
        )
        self.pkpd_model = CombinedModel.objects.get(pk=self.pkpd_model.pk)
        model = self.pkpd_model.get_myokit_model()
        model.validate()
        qnames = [v.qname() for v in model.variables()]
        # single shared weight input + median, one exponent per parameter
        self.assertEqual(qnames.count("Covariates.WT"), 1)
        self.assertEqual(qnames.count("Covariates.mu_WT"), 1)
        self.assertIn("Covariates.a_WT_PKCompartment_CL", qnames)
        self.assertIn("Covariates.a_WT_PKCompartment_V1", qnames)

    def test_simulation_uses_study_size_and_varies_output(self):
        from pkpdapp.models import Protocol, Dose, Unit, Variable

        # a virtual population driven purely by a weight covariate (no ETA)
        group = SubjectGroup.objects.create(
            name="Sim-Group 1",
            project=self.project,
            study_size=20,
            population_region=SubjectGroup.Region.US,
            m2f_ratio=0.5,
            age_min=20.0,
            age_max=60.0,
        )
        # dose the model so the concentration output is non-zero
        dose_var = Variable.objects.get(
            qname="PKCompartment.A1", dosed_pk_model=self.pkpd_model
        )
        protocol = Protocol.objects.create(
            name="cov protocol",
            compound=self.project.compound,
            amount_unit=Unit.objects.get(symbol="mg"),
            time_unit=Unit.objects.get(symbol="h"),
            variable=dose_var,
            project=self.project,
            group=group,
        )
        Dose.objects.create(protocol=protocol, start_time=0, amount=100)

        DerivedVariable.objects.create(
            pkpd_model=self.pkpd_model,
            pk_variable=self._cl_variable(),
            type=DerivedVariable.Type.WEIGHT_COVARIATE,
        )
        self.pkpd_model = CombinedModel.objects.get(pk=self.pkpd_model.pk)
        c1 = self.pkpd_model.variables.get(qname="PKCompartment.C1")
        time_qname = self.pkpd_model.get_myokit_model().binding("time").qname()
        results = self.pkpd_model.simulate(
            outputs=["PKCompartment.C1", time_qname], seed=123
        )
        group_result = next(r for r in results if r["group_id"] == group.id)
        # Monte-Carlo sample count is driven by the group's study size
        self.assertEqual(group_result["sample_count"], 20)
        # weight covariate on CL produces between-individual variability
        std = np.array(group_result["outputs"][c1.id]["std"])
        self.assertGreater(float(np.max(std)), 0.0)

    def test_delete_removes_injected_parameters(self):
        dv = DerivedVariable.objects.create(
            pkpd_model=self.pkpd_model,
            pk_variable=self._cl_variable(),
            type=DerivedVariable.Type.WEIGHT_COVARIATE,
        )
        self.pkpd_model = CombinedModel.objects.get(pk=self.pkpd_model.pk)
        self.assertTrue(
            self.pkpd_model.variables.filter(
                qname="Covariates.a_WT_PKCompartment_CL"
            ).exists()
        )
        dv.delete()
        self.pkpd_model = CombinedModel.objects.get(pk=self.pkpd_model.pk)
        self.assertFalse(
            self.pkpd_model.variables.filter(
                qname="Covariates.a_WT_PKCompartment_CL"
            ).exists()
        )
