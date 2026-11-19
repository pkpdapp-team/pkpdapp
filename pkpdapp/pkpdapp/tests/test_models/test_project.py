#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from pkpdapp.models import (
    CombinedModel,
    PharmacokineticModel,
    Project,
    Compound,
    Covariate,
    CovariatePopulation,
    Dataset,
    SubjectGroup,
    DerivedVariable,
)


class TestProject(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", password="12345")
        compound = Compound.objects.create(name="demo", compound_type="LM")
        self.project = Project.objects.create(name="demo", compound=compound)
        self.project.users.add(self.user)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_project_weight_unit_default(self):
        # weight unit should be set to default (g)
        self.assertEqual(self.project.species_weight_unit.symbol, "kg")

    def test_copy_clones_covariates_populations_and_derived_variables(self):
        dataset = Dataset.objects.create(name="dataset", project=self.project)
        dataset_group = SubjectGroup.objects.create(
            name="dataset group",
            dataset=dataset,
            project=self.project,
            study_size=37,
            age_min=18.0,
            age_max=75.0,
            m2f_ratio=0.4,
            population_region=SubjectGroup.Region.US,
        )
        project_group = SubjectGroup.objects.create(
            name="project group",
            project=self.project,
            study_size=12,
            age_min=25.0,
            age_max=55.0,
            m2f_ratio=0.7,
            population_region=SubjectGroup.Region.ASIA,
        )
        continuous = Covariate.objects.create(
            project=self.project, name="albumin", type=Covariate.Type.CONTINUOUS
        )
        categorical = Covariate.objects.create(
            project=self.project,
            name="ethnicity",
            type=Covariate.Type.CATEGORICAL,
            n_categories=3,
        )
        CovariatePopulation.objects.create(
            subject_group=dataset_group,
            covariate=continuous,
            median=42.0,
            variance=0.16,
        )
        CovariatePopulation.objects.create(
            subject_group=project_group,
            covariate=categorical,
            category_probabilities=[0.2, 0.3, 0.5],
        )
        model = CombinedModel.objects.create(
            name="covariate model",
            project=self.project,
            pk_model=PharmacokineticModel.objects.get(name="1-compartmental model"),
        )
        DerivedVariable.objects.create(
            pkpd_model=model,
            pk_variable=model.variables.get(qname="PKCompartment.CL"),
            covariate=continuous,
            type=DerivedVariable.Type.CUSTOM_CONT_COVARIATE,
        )

        copied_project = self.project.copy()

        copied_continuous = copied_project.covariates.get(name="albumin")
        copied_categorical = copied_project.covariates.get(name="ethnicity")
        self.assertNotEqual(copied_continuous.id, continuous.id)
        self.assertNotEqual(copied_categorical.id, categorical.id)
        copied_dataset_group = copied_project.datasets.first().groups.get(
            name="dataset group"
        )
        copied_project_group = copied_project.groups.get(name="project group")
        self.assertEqual(copied_dataset_group.study_size, dataset_group.study_size)
        self.assertEqual(copied_dataset_group.age_min, dataset_group.age_min)
        self.assertEqual(copied_dataset_group.age_max, dataset_group.age_max)
        self.assertEqual(copied_dataset_group.m2f_ratio, dataset_group.m2f_ratio)
        self.assertEqual(
            copied_dataset_group.population_region, dataset_group.population_region
        )
        copied_continuous_population = CovariatePopulation.objects.get(
            subject_group=copied_dataset_group, covariate=copied_continuous
        )
        self.assertEqual(copied_continuous_population.median, 42.0)
        self.assertEqual(copied_continuous_population.variance, 0.16)
        copied_categorical_population = CovariatePopulation.objects.get(
            subject_group=copied_project_group, covariate=copied_categorical
        )
        self.assertEqual(
            copied_categorical_population.category_probabilities, [0.2, 0.3, 0.5]
        )

        copied_model = copied_project.pk_models.get(name="covariate model")
        copied_derived_variable = copied_model.derived_variables.get(
            type=DerivedVariable.Type.CUSTOM_CONT_COVARIATE
        )
        self.assertEqual(copied_derived_variable.covariate, copied_continuous)
        self.assertTrue(
            copied_model.variables.filter(
                qname=f"Covariates.COV_{copied_continuous.id}"
            ).exists()
        )

        continuous.delete()
        copied_derived_variable.refresh_from_db()
        self.assertEqual(copied_derived_variable.covariate, copied_continuous)
