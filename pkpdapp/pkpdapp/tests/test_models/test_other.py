#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import pkpdapp.tests  # noqa: F401
from django.test import TestCase
from pkpdapp.models import (
    Dataset, Project,
    PharmacodynamicModel,
    Compound,
)
from django.contrib.auth.models import User
from django.utils import timezone


class TestCompoundModel(TestCase):
    def test_model_creation(self):
        c = Compound.objects.create(
            name='my_cool_compound',
            description='placebo',
            molecular_mass=100,
            target_molecular_mass=100,
        )
        self.assertTrue(isinstance(c, Compound))


class TestProfileModel(TestCase):
    def test_profile_creation(self):
        u = User.objects.create_user(
            'john', 'lennon@thebeatles.com', 'johnpassword'
        )
        c = Compound.objects.create(
            name='my_cool_compound',
            description='placebo',
            molecular_mass=100,
            target_molecular_mass=100,
        )
        p = Project.objects.create(
            name='my_cool_project',
            description='description for my cool project',
            compound=c,
        )
        self.assertEqual(u.profile.user.username, 'john')
        u.profile.selected_project = p
        self.assertEqual(u.profile.selected_project, p)


class TestProjectModel(TestCase):
    def setUp(self):
        c = Compound.objects.create(
            name='my_cool_compound',
            description='placebo',
            molecular_mass=100,
            target_molecular_mass=100,
        )

        Project.objects.create(
            name='my_cool_project',
            description='description for my cool project',
            compound=c,
        )

    def test_project_creation(self):
        p = Project.objects.get(name='my_cool_project')
        self.assertTrue(isinstance(p, Project))

    def test_add_to_project(self):
        p = Project.objects.get(name='my_cool_project')
        d = Dataset.objects.create(
            name='my_cool_dataset',
            datetime=timezone.now(),
            description='description for my cool dataset',
        )
        p.datasets.add(d)
        self.assertQuerysetEqual(p.datasets.all(), [repr(d)])

        m = PharmacodynamicModel.objects.create(
            name='my_cool_model',
            description='description for my cool model',
        )
        p.pd_models.add(m)
        self.assertQuerysetEqual(p.pd_models.all(), [repr(m)])

        u = User.objects.create_user(
            'john', 'lennon@thebeatles.com', 'johnpassword'
        )
        p.users.add(u)
        self.assertQuerysetEqual(p.users.all(), [repr(u)])
