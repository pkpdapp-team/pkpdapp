#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import numpy as np
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import TestCase

from pkpdapp.models import (
    CombinedModel,
    Compound,
    Correlation,
    Distribution,
    PharmacodynamicModel,
    PharmacokineticModel,
    Project,
    Variable,
)


class TestDistribution(TestCase):
    def setUp(self):
        self.compound = Compound.objects.create(name="demo", compound_type="LM")
        self.project = Project.objects.create(
            name="test project", compound=self.compound
        )
        pd = PharmacodynamicModel.objects.get(
            name="tumour_growth_gompertz",
            read_only=False,
        )
        pk = PharmacokineticModel.objects.get(name="one_compartment_clinical")
        self.model = CombinedModel.objects.create(
            name="my wonderful model",
            pd_model=pd,
            pk_model=pk,
            project=self.project,
        )
        self.variable = Variable.objects.get(
            qname="PDCompartment.TS0", dosed_pk_model=self.model
        )

    def test_one_to_one_uniqueness(self):
        Distribution.objects.create(variable=self.variable, variance=0.1)
        with self.assertRaises(IntegrityError):
            Distribution.objects.create(variable=self.variable, variance=0.2)

    def test_sample_normal(self):
        dist = Distribution(pdf=Distribution.PDF.NORMAL, variance=4.0)
        rng = np.random.default_rng(0)
        samples = np.array([dist.sample(10.0, rng) for _ in range(20000)])
        self.assertAlmostEqual(samples.mean(), 10.0, delta=0.1)
        self.assertAlmostEqual(samples.std(), 2.0, delta=0.1)

    def test_sample_lognormal_positive_and_collapses(self):
        dist = Distribution(pdf=Distribution.PDF.LOGNORMAL, variance=0.25)
        rng = np.random.default_rng(1)
        samples = np.array([dist.sample(3.0, rng) for _ in range(5000)])
        self.assertTrue(np.all(samples > 0))

        zero_var = Distribution(pdf=Distribution.PDF.LOGNORMAL, variance=0.0)
        self.assertAlmostEqual(zero_var.sample(3.0, rng), 3.0)

    def test_sample_logit_in_unit_interval_and_collapses(self):
        dist = Distribution(pdf=Distribution.PDF.LOGIT, variance=1.0)
        rng = np.random.default_rng(2)
        samples = np.array([dist.sample(0.4, rng) for _ in range(5000)])
        self.assertTrue(np.all(samples > 0))
        self.assertTrue(np.all(samples < 1))

        zero_var = Distribution(pdf=Distribution.PDF.LOGIT, variance=0.0)
        self.assertAlmostEqual(zero_var.sample(0.4, rng), 0.4)

    def test_validate_domain_errors(self):
        with self.assertRaises(ValueError):
            Distribution(pdf=Distribution.PDF.LOGNORMAL, variance=0.1).validate(0.0)
        for bad_mean in (0.0, 1.0, 1.5):
            with self.assertRaises(ValueError):
                Distribution(pdf=Distribution.PDF.LOGIT, variance=0.1).validate(
                    bad_mean
                )
        with self.assertRaises(ValueError):
            Distribution(pdf=Distribution.PDF.NORMAL, variance=-1.0).validate(1.0)

        # valid combinations do not raise
        Distribution(pdf=Distribution.PDF.LOGNORMAL, variance=0.1).validate(2.0)
        Distribution(pdf=Distribution.PDF.LOGIT, variance=0.1).validate(0.5)
        Distribution(pdf=Distribution.PDF.NORMAL, variance=0.1).validate(-3.0)

    def test_variable_copy_duplicates_distribution(self):
        Distribution.objects.create(
            variable=self.variable,
            pdf=Distribution.PDF.LOGNORMAL,
            variance=0.3,
        )
        new_model = CombinedModel.objects.create(
            name="copy target",
            pd_model=self.model.pd_model,
            pk_model=self.model.pk_model,
            project=self.project,
        )
        new_variable = Variable.objects.get(
            qname="PDCompartment.TS0", dosed_pk_model=new_model
        )
        new_variable.copy(self.variable, self.project)

        copied = Distribution.objects.get(variable=new_variable)
        self.assertEqual(copied.pdf, Distribution.PDF.LOGNORMAL)
        self.assertEqual(copied.variance, 0.3)

    def test_apply_matches_sample_math(self):
        for pdf, mean in (
            (Distribution.PDF.NORMAL, 5.0),
            (Distribution.PDF.LOGNORMAL, 3.0),
            (Distribution.PDF.LOGIT, 0.4),
        ):
            dist = Distribution(pdf=pdf, variance=0.2)
            # eta == 0 collapses every pdf to the typical value
            self.assertAlmostEqual(dist.apply(mean, 0.0), mean)


class TestCorrelation(TestCase):
    def setUp(self):
        self.compound = Compound.objects.create(name="demo", compound_type="LM")
        self.project = Project.objects.create(
            name="test project", compound=self.compound
        )
        pd = PharmacodynamicModel.objects.get(
            name="tumour_growth_gompertz",
            read_only=False,
        )
        pk = PharmacokineticModel.objects.get(name="one_compartment_clinical")
        self.model = CombinedModel.objects.create(
            name="my wonderful model",
            pd_model=pd,
            pk_model=pk,
            project=self.project,
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

    def test_canonical_ordering_on_save(self):
        # store with the higher id first; save() should swap to lower id first
        high, low = sorted([self.dist_1, self.dist_2], key=lambda d: -d.id)
        correlation = Correlation.objects.create(
            distribution_1=high, distribution_2=low, coefficient=0.5
        )
        correlation.refresh_from_db()
        self.assertLess(
            correlation.distribution_1_id, correlation.distribution_2_id
        )

    def test_unique_pair_constraint(self):
        Correlation.objects.create(
            distribution_1=self.dist_1, distribution_2=self.dist_2
        )
        # the reversed order is the same unordered pair, so it must clash
        with self.assertRaises(IntegrityError):
            Correlation.objects.create(
                distribution_1=self.dist_2, distribution_2=self.dist_1
            )

    def test_coefficient_range_validation(self):
        for bad in (-1.5, 1.5):
            correlation = Correlation(
                distribution_1=self.dist_1,
                distribution_2=self.dist_2,
                coefficient=bad,
            )
            with self.assertRaises(ValidationError):
                correlation.full_clean()

    def test_get_correlations_finds_both_sides(self):
        correlation = Correlation.objects.create(
            distribution_1=self.dist_1, distribution_2=self.dist_2, coefficient=0.3
        )
        self.assertEqual(list(self.dist_1.get_correlations()), [correlation])
        self.assertEqual(list(self.dist_2.get_correlations()), [correlation])

    def test_model_copy_duplicates_correlation(self):
        Correlation.objects.create(
            distribution_1=self.dist_1, distribution_2=self.dist_2, coefficient=0.4
        )
        new_model = self.model.copy(self.project)

        new_distribution_ids = Distribution.objects.filter(
            variable__dosed_pk_model=new_model
        ).values_list("id", flat=True)
        copied = Correlation.objects.filter(
            distribution_1__in=new_distribution_ids,
            distribution_2__in=new_distribution_ids,
        )
        self.assertEqual(copied.count(), 1)
        self.assertEqual(copied.first().coefficient, 0.4)
