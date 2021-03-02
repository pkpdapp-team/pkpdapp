#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.test import TestCase
from pkpdapp.models import (
    Dataset, Project, Biomarker, BiomarkerType,
    PharmacodynamicModel, DosedPharmacokineticModel,
)
from django.contrib.auth.models import User
from django.utils import timezone


class TestDatasetModel(TestCase):
    def test_dataset_creation(self):
        d = Dataset.objects.create(
            name='my_cool_dataset',
            datetime=timezone.now(),
            description='description for my cool dataset',
            administration_type='T1',
        )
        self.assertTrue(isinstance(d, Dataset))


class TestBiomarkerTypeModel(TestCase):
    def test_biomarker_type_creation(self):
        d = Dataset.objects.create(
            name='my_cool_dataset',
            datetime=timezone.now(),
            description='description for my cool biomarker',
            administration_type='T1',
        )
        bt = BiomarkerType.objects.create(
            name='my_cool_biomarker_type',
            description='description for my cool biomarker_type',
            unit='mg',
            dataset=d,
        )
        self.assertTrue(isinstance(bt, BiomarkerType))


class TestBiomarkerModel(TestCase):
    def test_biomarker_creation(self):
        d = Dataset.objects.create(
            name='my_cool_dataset',
            datetime=timezone.now(),
            description='description for my cool biomarker',
            administration_type='T1',
        )
        b = BiomarkerType.objects.create(
            name='my type',
            dataset=d,
        )
        b = Biomarker.objects.create(
            time=0.0,
            value=1.0,
            subject_id=1,
            biomarker_type=b
        )
        self.assertTrue(isinstance(b, Biomarker))


class TestPharmodynamicModel(TestCase):
    def test_pd_model_creation(self):
        m = PharmacodynamicModel.objects.create(
            name='my_cool_model',
            description='description for my cool model',
            sbml='sbml_here',
        )
        self.assertTrue(isinstance(m, PharmacodynamicModel))


class TestProfileModel(TestCase):
    def test_profile_creation(self):
        u = User.objects.create_user(
            'john', 'lennon@thebeatles.com', 'johnpassword'
        )
        p = Project.objects.create(
            name='my_cool_project',
            description='description for my cool project',
        )
        self.assertEqual(u.profile.user.username, 'john')
        u.profile.selected_project = p
        self.assertEqual(u.profile.selected_project, p)


class TestProjectModel(TestCase):
    def setUp(self):
        Project.objects.create(
            name='my_cool_project',
            description='description for my cool project',
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
            administration_type='T1',
        )
        p.datasets.add(d)
        self.assertQuerysetEqual(p.datasets.all(), [repr(d)])

        m = PharmacodynamicModel.objects.create(
            name='my_cool_model',
            description='description for my cool model',
            sbml='sbml_here',
        )
        p.pd_models.add(m)
        self.assertQuerysetEqual(p.pd_models.all(), [repr(m)])

        u = User.objects.create_user(
            'john', 'lennon@thebeatles.com', 'johnpassword'
        )
        p.users.add(u)
        self.assertQuerysetEqual(p.users.all(), [repr(u)])
