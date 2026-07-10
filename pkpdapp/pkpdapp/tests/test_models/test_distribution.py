#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import numpy as np
from django.db import IntegrityError
from django.test import TestCase

from pkpdapp.models import (
    CombinedModel,
    Compound,
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
