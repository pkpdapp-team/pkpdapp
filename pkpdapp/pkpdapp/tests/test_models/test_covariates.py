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
    CovariatePopulation,
    DerivedVariable,
    PharmacokineticModel,
    Project,
    Compound,
    SubjectGroup,
)


class TestCovariateSampling(SimpleTestCase):
    """The sampling logic lives on Covariate and needs no database."""

    def test_none_population_yields_neutral_values(self):
        continuous = Covariate(name="albumin", type=Covariate.Type.CONTINUOUS)
        categorical = Covariate(name="eth", type=Covariate.Type.CATEGORICAL)
        rng = np.random.default_rng(0)
        # neutral values collapse the covariate factor to 1
        self.assertEqual(continuous.sample(None, rng), 1.0)
        self.assertEqual(categorical.sample(None, rng), 0.0)
        self.assertEqual(continuous.centering_value(None), 1.0)

    def test_weight_centering_is_m2f_weighted_region_median(self):
        from pkpdapp.utils.weight_populations import (
            FEMALE,
            MALE,
            reference_median_weight,
        )

        covariate = Covariate(
            name="weight",
            type=Covariate.Type.CONTINUOUS,
            builtin=Covariate.Builtin.WEIGHT,
        )
        group = SubjectGroup(population_region="US", m2f_ratio=0.25)
        population = CovariatePopulation(subject_group=group)
        expected = 0.25 * reference_median_weight("US", MALE) + 0.75 * (
            reference_median_weight("US", FEMALE)
        )
        self.assertAlmostEqual(covariate.centering_value(population), expected)

    def test_sex_sample_uses_supplied_value(self):
        covariate = Covariate(
            name="sex",
            type=Covariate.Type.CATEGORICAL,
            builtin=Covariate.Builtin.SEX,
        )
        group = SubjectGroup(m2f_ratio=1.0)
        population = CovariatePopulation(subject_group=group)
        rng = np.random.default_rng(0)
        # weight's already-drawn sex is reused rather than redrawn
        self.assertEqual(covariate.sample(population, rng, sex=0), 0.0)
        self.assertEqual(covariate.sample(population, rng, sex=1), 1.0)

    def test_custom_categorical_respects_probabilities(self):
        covariate = Covariate(
            name="eth", type=Covariate.Type.CATEGORICAL, n_categories=3
        )
        population = CovariatePopulation(category_probabilities=[0.0, 1.0, 0.0])
        rng = np.random.default_rng(1)
        # all probability mass on category 1
        for _ in range(20):
            self.assertEqual(covariate.sample(population, rng), 1.0)

    def test_custom_continuous_is_lognormal_about_median(self):
        covariate = Covariate(name="albumin", type=Covariate.Type.CONTINUOUS)
        population = CovariatePopulation(median=40.0, variance=0.0)
        rng = np.random.default_rng(2)
        # zero variance collapses to the median
        self.assertAlmostEqual(covariate.sample(population, rng), 40.0)


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

    def test_adding_covariate_creates_default_populations(self):
        group_a = SubjectGroup.objects.create(name="A", project=self.project)
        group_b = SubjectGroup.objects.create(name="B", project=self.project)
        url = self.reverse("covariate-list")

        # categorical covariate -> uniform probabilities per group
        response = self.client.post(
            url,
            data={
                "project": self.project.id,
                "name": "eth",
                "type": Covariate.Type.CATEGORICAL,
                "n_categories": 4,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        covariate = Covariate.objects.get(id=response.data["id"])
        populations = covariate.populations.all()
        self.assertEqual(populations.count(), 2)
        self.assertEqual(
            {p.subject_group_id for p in populations}, {group_a.id, group_b.id}
        )
        for population in populations:
            self.assertEqual(
                population.category_probabilities, [0.25, 0.25, 0.25, 0.25]
            )

        # continuous covariate -> default median/variance per group
        response = self.client.post(
            url,
            data={
                "project": self.project.id,
                "name": "albumin",
                "type": Covariate.Type.CONTINUOUS,
            },
            format="json",
        )
        covariate = Covariate.objects.get(id=response.data["id"])
        for population in covariate.populations.all():
            self.assertEqual(population.median, 1.0)
            self.assertEqual(population.variance, 0.09)

    def test_adding_group_creates_populations_for_existing_covariates(self):
        covariate = Covariate.objects.create(
            project=self.project, name="albumin", type=Covariate.Type.CONTINUOUS
        )
        url = self.reverse("subject_group-list")
        response = self.client.post(
            url,
            data={"name": "new group", "project": self.project.id, "protocols": []},
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertTrue(
            covariate.populations.filter(
                subject_group_id=response.data["id"]
            ).exists()
        )

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


class TestCovariatePopulationDefaults(TestCase):
    def setUp(self):
        compound = Compound.objects.create(name="demo")
        self.project = Project.objects.create(name="demo", compound=compound)
        self.group = SubjectGroup.objects.create(name="G1", project=self.project)

    def test_continuous_population_defaults(self):
        covariate = Covariate.objects.create(
            project=self.project, name="albumin", type=Covariate.Type.CONTINUOUS
        )
        population = CovariatePopulation.objects.create(
            subject_group=self.group, covariate=covariate
        )
        self.assertEqual(population.median, 1.0)
        self.assertEqual(population.variance, 0.09)

    def test_categorical_population_defaults_to_uniform(self):
        covariate = Covariate.objects.create(
            project=self.project,
            name="eth",
            type=Covariate.Type.CATEGORICAL,
            n_categories=4,
        )
        population = CovariatePopulation.objects.create(
            subject_group=self.group, covariate=covariate
        )
        self.assertEqual(population.category_probabilities, [0.25, 0.25, 0.25, 0.25])


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
