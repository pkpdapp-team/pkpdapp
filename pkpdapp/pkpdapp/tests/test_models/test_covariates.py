#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import numpy as np
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import SimpleTestCase, TestCase

from pkpdapp.models import (
    CombinedModel,
    Covariate,
    CovariatePopulation,
    DerivedVariable,
    Distribution,
    PharmacokineticModel,
    Project,
    ProjectAccess,
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
        self.other_user = User.objects.create_user(
            username="othercovuser", password="12345"
        )
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

    def test_reference_value_round_trip_and_validation(self):
        url = self.reverse("covariate-list")
        # a continuous covariate carries a user-provided reference value
        response = self.client.post(
            url,
            data={
                "project": self.project.id,
                "name": "albumin",
                "type": Covariate.Type.CONTINUOUS,
                "reference_value": 42.0,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["reference_value"], 42.0)

        # the reference value must be positive (it is a divisor)
        bad = self.client.post(
            url,
            data={
                "project": self.project.id,
                "name": "gfr",
                "type": Covariate.Type.CONTINUOUS,
                "reference_value": 0.0,
            },
            format="json",
        )
        self.assertEqual(bad.status_code, 400)

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

    def test_covariate_endpoints_only_list_accessible_projects(self):
        local_covariate = Covariate.objects.create(
            project=self.project, name="local", type=Covariate.Type.CONTINUOUS
        )
        local_group = SubjectGroup.objects.create(name="local", project=self.project)
        local_population = CovariatePopulation.objects.create(
            subject_group=local_group, covariate=local_covariate
        )
        foreign_project = Project.objects.create(
            name="foreign", compound=Compound.objects.create(name="foreign")
        )
        foreign_project.users.add(self.other_user)
        foreign_covariate = Covariate.objects.create(
            project=foreign_project, name="foreign", type=Covariate.Type.CONTINUOUS
        )
        foreign_group = SubjectGroup.objects.create(
            name="foreign", project=foreign_project
        )
        CovariatePopulation.objects.create(
            subject_group=foreign_group, covariate=foreign_covariate
        )

        covariate_response = self.client.get(self.reverse("covariate-list"))
        population_response = self.client.get(self.reverse("covariate_population-list"))
        self.assertEqual(covariate_response.status_code, 200)
        self.assertEqual(population_response.status_code, 200)
        self.assertEqual(
            [row["id"] for row in covariate_response.data], [local_covariate.id]
        )
        self.assertEqual(
            [row["id"] for row in population_response.data], [local_population.id]
        )

        self.assertEqual(
            self.client.get(
                self.reverse("covariate-list"), {"project_id": foreign_project.id}
            ).data,
            [],
        )
        self.assertEqual(
            self.client.get(
                self.reverse("covariate_population-list"),
                {"project_id": foreign_project.id},
            ).data,
            [],
        )

    def test_covariate_population_rejects_mismatched_projects(self):
        group = SubjectGroup.objects.create(name="local", project=self.project)
        foreign_project = Project.objects.create(
            name="foreign", compound=Compound.objects.create(name="foreign")
        )
        foreign_covariate = Covariate.objects.create(
            project=foreign_project, name="foreign", type=Covariate.Type.CONTINUOUS
        )
        foreign_group = SubjectGroup.objects.create(
            name="foreign", project=foreign_project
        )

        mismatched_response = self.client.post(
            self.reverse("covariate_population-list"),
            data={"subject_group": group.id, "covariate": foreign_covariate.id},
            format="json",
        )
        inaccessible_response = self.client.post(
            self.reverse("covariate_population-list"),
            data={"subject_group": foreign_group.id, "covariate": foreign_covariate.id},
            format="json",
        )
        self.assertEqual(mismatched_response.status_code, 400)
        self.assertEqual(inaccessible_response.status_code, 403)
        self.assertFalse(
            CovariatePopulation.objects.filter(
                subject_group=group, covariate=foreign_covariate
            ).exists()
        )
        self.assertFalse(
            CovariatePopulation.objects.filter(
                subject_group=foreign_group, covariate=foreign_covariate
            ).exists()
        )

    def test_read_only_user_cannot_change_covariate_population(self):
        covariate = Covariate.objects.create(
            project=self.project, name="local", type=Covariate.Type.CONTINUOUS
        )
        group = SubjectGroup.objects.create(name="local", project=self.project)
        population = CovariatePopulation.objects.create(
            subject_group=group, covariate=covariate
        )
        second_covariate = Covariate.objects.create(
            project=self.project, name="other", type=Covariate.Type.CONTINUOUS
        )
        access = ProjectAccess.objects.get(user=self.user, project=self.project)
        access.read_only = True
        access.save()

        create_response = self.client.post(
            self.reverse("covariate_population-list"),
            data={"subject_group": group.id, "covariate": second_covariate.id},
            format="json",
        )
        update_response = self.client.patch(
            self.reverse("covariate_population-detail", args=(population.id,)),
            data={"median": 2.0},
            format="json",
        )
        self.assertEqual(create_response.status_code, 403)
        self.assertEqual(update_response.status_code, 403)

    def test_study_size_must_be_at_least_one(self):
        group = SubjectGroup.objects.create(name="G1", project=self.project)
        response = self.client.patch(
            self.reverse("subject_group-detail", args=(group.id,)),
            data={"study_size": 0},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        group.refresh_from_db()
        self.assertEqual(group.study_size, 200)

    def test_covariate_structural_fields_are_immutable(self):
        categorical = Covariate.objects.create(
            project=self.project,
            name="ethnicity",
            type=Covariate.Type.CATEGORICAL,
            n_categories=3,
        )
        model = CombinedModel.objects.create(
            name="covariate model",
            project=self.project,
            pk_model=PharmacokineticModel.objects.get(name="1-compartmental model"),
        )
        DerivedVariable.objects.create(
            pkpd_model=model,
            pk_variable=model.variables.get(qname="PKCompartment.CL"),
            covariate=categorical,
            type=DerivedVariable.Type.CUSTOM_CAT_COVARIATE,
        )
        detail_url = self.reverse("covariate-detail", args=(categorical.id,))

        type_response = self.client.patch(
            detail_url, data={"type": Covariate.Type.CONTINUOUS}, format="json"
        )
        category_response = self.client.patch(
            detail_url, data={"n_categories": 4}, format="json"
        )
        rename_response = self.client.patch(
            detail_url, data={"name": "ancestry"}, format="json"
        )
        self.assertEqual(type_response.status_code, 400)
        self.assertEqual(category_response.status_code, 400)
        self.assertEqual(rename_response.status_code, 200)
        categorical.refresh_from_db()
        self.assertEqual(categorical.name, "ancestry")
        self.assertEqual(categorical.type, Covariate.Type.CATEGORICAL)
        self.assertEqual(categorical.n_categories, 3)
        self.assertTrue(
            model.variables.filter(
                qname=f"Covariates.CL_d_COV_{categorical.id}_2"
            ).exists()
        )
        self.assertFalse(
            model.variables.filter(
                qname=f"Covariates.CL_d_COV_{categorical.id}_3"
            ).exists()
        )

        unreferenced = Covariate.objects.create(
            project=self.project, name="albumin", type=Covariate.Type.CONTINUOUS
        )
        unreferenced_response = self.client.patch(
            self.reverse("covariate-detail", args=(unreferenced.id,)),
            data={"type": Covariate.Type.CATEGORICAL, "n_categories": 2},
            format="json",
        )
        self.assertEqual(unreferenced_response.status_code, 400)


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

    def test_study_size_validation_and_constraint(self):
        self.group.study_size = 0
        with self.assertRaises(ValidationError):
            self.group.full_clean()
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                SubjectGroup.objects.filter(pk=self.group.pk).update(study_size=0)

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
        # a realistic species weight so the weight covariate centres sensibly
        self.project = Project.objects.create(
            name="demo", compound=compound, species_weight=70.0
        )
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
        self.assertIn("Covariates.CL_a_WT", qnames)
        self.assertIn("Covariates.CL_cov", qnames)
        # the centring reference is baked in, not a mu_ input variable
        self.assertNotIn("Covariates.mu_WT", qnames)

        # CL is clearance [L/h] so the default exponent should be 0.75
        a_var = self.pkpd_model.variables.get(
            qname="Covariates.CL_a_WT"
        )
        self.assertAlmostEqual(a_var.get_default_value(), 0.75)

        # the adjusted value multiplies CL by (WT / species_weight)^a, with the
        # species weight (70) baked in as a literal (no mu_ variable)
        adj = model.get("Covariates.CL_cov")
        rhs = str(adj.rhs())
        self.assertIn("PKCompartment.CL", rhs)
        self.assertIn("Covariates.WT", rhs)
        self.assertIn("70", rhs)
        self.assertNotIn("mu_", rhs)

    def test_age_covariate_uses_fixed_reference(self):
        DerivedVariable.objects.create(
            pkpd_model=self.pkpd_model,
            pk_variable=self._cl_variable(),
            type=DerivedVariable.Type.AGE_COVARIATE,
        )
        self.pkpd_model = CombinedModel.objects.get(pk=self.pkpd_model.pk)
        model = self.pkpd_model.get_myokit_model()
        model.validate()
        # age is centred on the fixed reference of 25, baked in (no mu_ variable)
        rhs = str(model.get("Covariates.CL_cov").rhs())
        self.assertIn("Covariates.AGE", rhs)
        self.assertIn("25", rhs)
        self.assertFalse(
            self.pkpd_model.variables.filter(qname="Covariates.mu_AGE").exists()
        )

    def test_custom_continuous_uses_reference_value(self):
        covariate = Covariate.objects.create(
            project=self.project,
            name="albumin",
            type=Covariate.Type.CONTINUOUS,
            reference_value=40.0,
        )
        DerivedVariable.objects.create(
            pkpd_model=self.pkpd_model,
            pk_variable=self._cl_variable(),
            covariate=covariate,
            type=DerivedVariable.Type.CUSTOM_CONT_COVARIATE,
        )
        self.pkpd_model = CombinedModel.objects.get(pk=self.pkpd_model.pk)
        model = self.pkpd_model.get_myokit_model()
        model.validate()
        # centred on the covariate's own reference value (40), baked in, no mu_
        rhs = str(model.get("Covariates.CL_cov").rhs())
        self.assertIn(f"Covariates.COV_{covariate.id}", rhs)
        self.assertIn("40", rhs)
        self.assertFalse(
            self.pkpd_model.variables.filter(
                qname=f"Covariates.mu_COV_{covariate.id}"
            ).exists()
        )

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
        self.assertIn("Covariates.CL_d_SEX_1", qnames)
        # only one delta for two categories
        self.assertNotIn("Covariates.CL_d_SEX_2", qnames)

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
        input_name = f"COV_{cov.id}"
        self.assertIn(f"Covariates.{input_name}", qnames)
        self.assertIn(f"Covariates.CL_d_{input_name}_1", qnames)
        self.assertIn(f"Covariates.CL_d_{input_name}_2", qnames)

    def test_custom_covariates_with_colliding_names_have_distinct_inputs(self):
        covariate_1 = Covariate.objects.create(
            project=self.project, name="foo-bar", type=Covariate.Type.CONTINUOUS
        )
        covariate_2 = Covariate.objects.create(
            project=self.project, name="foo_bar", type=Covariate.Type.CONTINUOUS
        )
        for covariate in (covariate_1, covariate_2):
            DerivedVariable.objects.create(
                pkpd_model=self.pkpd_model,
                pk_variable=self._cl_variable(),
                covariate=covariate,
                type=DerivedVariable.Type.CUSTOM_CONT_COVARIATE,
            )

        self.pkpd_model = CombinedModel.objects.get(pk=self.pkpd_model.pk)
        qnames = {v.qname for v in self.pkpd_model.variables.all()}
        for covariate in (covariate_1, covariate_2):
            input_name = f"COV_{covariate.id}"
            self.assertIn(f"Covariates.{input_name}", qnames)
            self.assertNotIn(f"Covariates.mu_{input_name}", qnames)
            self.assertIn(
                f"Covariates.CL_a_{input_name}", qnames
            )

        bindings = self.pkpd_model._covariate_bindings()
        self.assertEqual({binding.covariate.id for binding in bindings}, {
            covariate_1.id,
            covariate_2.id,
        })

    def test_custom_covariate_cannot_collide_with_builtin_input(self):
        covariate = Covariate.objects.create(
            project=self.project, name="WT", type=Covariate.Type.CONTINUOUS
        )
        DerivedVariable.objects.create(
            pkpd_model=self.pkpd_model,
            pk_variable=self._cl_variable(),
            covariate=covariate,
            type=DerivedVariable.Type.CUSTOM_CONT_COVARIATE,
        )

        self.pkpd_model = CombinedModel.objects.get(pk=self.pkpd_model.pk)
        qnames = {v.qname for v in self.pkpd_model.variables.all()}
        self.assertIn(f"Covariates.COV_{covariate.id}", qnames)
        self.assertNotIn("Covariates.WT", qnames)

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
        # single shared weight input, one exponent per parameter, no mu_ variable
        self.assertEqual(qnames.count("Covariates.WT"), 1)
        self.assertEqual(qnames.count("Covariates.mu_WT"), 0)
        self.assertIn("Covariates.CL_a_WT", qnames)
        self.assertIn("Covariates.V1_a_WT", qnames)

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

    def test_simulate_returns_sampled_parameters(self):
        from pkpdapp.models import Protocol, Dose, Unit, Variable

        # a virtual population driven by a weight covariate on CL and a random
        # effect (distribution) on V1
        group = SubjectGroup.objects.create(
            name="Sim-Group 1",
            project=self.project,
            study_size=15,
            population_region=SubjectGroup.Region.US,
            m2f_ratio=0.5,
            age_min=20.0,
            age_max=60.0,
        )
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
        v1 = self.pkpd_model.variables.get(qname="PKCompartment.V1")
        Distribution.objects.create(
            variable=v1, pdf=Distribution.PDF.NORMAL, variance=0.1
        )

        wt = self.pkpd_model.variables.get(qname="Covariates.WT")
        # the centring reference is baked into the model, so there is no mu_ variable
        self.assertFalse(
            self.pkpd_model.variables.filter(qname="Covariates.mu_WT").exists()
        )

        time_qname = self.pkpd_model.get_myokit_model().binding("time").qname()
        results = self.pkpd_model.simulate(
            outputs=["PKCompartment.C1", time_qname], seed=123
        )
        group_result = next(r for r in results if r["group_id"] == group.id)
        parameters = group_result["parameters"]

        # the distributed parameter and the covariate input are reported, keyed by
        # variable id, one value per individual (study_size)
        self.assertIn(v1.id, parameters)
        self.assertIn(wt.id, parameters)
        self.assertEqual(len(parameters[v1.id]), 15)
        self.assertEqual(len(parameters[wt.id]), 15)
        # a random effect actually varies the sampled values
        self.assertGreater(float(np.std(parameters[v1.id])), 0.0)

    def test_deterministic_simulation_returns_no_parameters(self):
        # no distribution and no covariate -> a deterministic run with no samples
        results = self.pkpd_model.simulate(outputs=["PKCompartment.C1"], seed=1)
        for group_result in results:
            self.assertEqual(group_result["parameters"], {})

    def test_delete_removes_injected_parameters(self):
        dv = DerivedVariable.objects.create(
            pkpd_model=self.pkpd_model,
            pk_variable=self._cl_variable(),
            type=DerivedVariable.Type.WEIGHT_COVARIATE,
        )
        self.pkpd_model = CombinedModel.objects.get(pk=self.pkpd_model.pk)
        self.assertTrue(
            self.pkpd_model.variables.filter(
                qname="Covariates.CL_a_WT"
            ).exists()
        )
        dv.delete()
        self.pkpd_model = CombinedModel.objects.get(pk=self.pkpd_model.pk)
        self.assertFalse(
            self.pkpd_model.variables.filter(
                qname="Covariates.CL_a_WT"
            ).exists()
        )
