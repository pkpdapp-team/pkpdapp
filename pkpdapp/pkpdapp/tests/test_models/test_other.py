#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.test import TestCase
from pkpdapp.models import (
    Dataset, Project, Biomarker, BiomarkerType,
    PharmacodynamicModel, Protocol, PharmacokineticModel,
    PkpdModel, Compound, DosedPharmacokineticModel,
    Subject
)
from django.contrib.auth.models import User
from django.utils import timezone
from django.db.utils import IntegrityError


class TestDatasetModel(TestCase):
    def test_dataset_creation(self):
        d = Dataset.objects.create(
            name='my_cool_dataset',
            datetime=timezone.now(),
            description='description for my cool dataset',
        )
        self.assertTrue(isinstance(d, Dataset))


class TestSubjectModel(TestCase):
    def setUp(self):
        self.dataset = Dataset.objects.create(
            name='test_subject_model',
            datetime=timezone.now(),
            description='description for my cool dataset',
        )

    def test_subject_creation(self):
        metadata = {
            'test': 2
        }
        s = Subject.objects.create(
            id_in_dataset=1, dataset=self.dataset, metadata=metadata
        )
        self.assertTrue(isinstance(s, Subject))

    def test_subject_constraint(self):

        metadata = {
            'test': 2
        }
        Subject.objects.create(
            id_in_dataset=2, dataset=self.dataset, metadata=metadata
        )

        # this is ok
        d2 = Dataset.objects.create(
            name='test_subject_model2',
            datetime=timezone.now(),
            description='description for my cool dataset',
        )
        Subject.objects.create(
            id_in_dataset=2, dataset=d2, metadata=metadata
        )

        # this should raise error
        with self.assertRaises(IntegrityError) as context:
            Subject.objects.create(
                id_in_dataset=2, dataset=self.dataset, metadata=metadata
            )

        self.assertTrue('UNIQUE constraint failed' in str(context.exception))


class TestBiomarkerTypeModel(TestCase):
    def test_biomarker_type_creation(self):
        d = Dataset.objects.create(
            name='my_cool_dataset',
            datetime=timezone.now(),
            description='description for my cool biomarker',
        )

        bt = BiomarkerType.objects.create(
            name='my_cool_biomarker_type',
            description='description for my cool biomarker_type',
            dataset=d,
        )
        self.assertTrue(isinstance(bt, BiomarkerType))


class TestBiomarkerModel(TestCase):
    def test_biomarker_creation(self):
        d = Dataset.objects.create(
            name='my_cool_dataset',
            datetime=timezone.now(),
            description='description for my cool biomarker',
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


class TestCompoundModel(TestCase):
    def test_model_creation(self):
        c = Compound.objects.create(
            name='my_cool_compound',
            description='placebo',
        )
        self.assertTrue(isinstance(c, Compound))


class TestProtocolModel(TestCase):
    def test_model_creation(self):
        c = Compound.objects.create(
            name='my_cool_compound',
            description='placebo',
        )

        # test optional dataset
        p = Protocol.objects.create(
            name='my_cool_protocol',
            compound=c,
            subject_id=1
        )

        self.assertTrue(isinstance(p, Protocol))

        # test with dataset
        d = Dataset.objects.create(
            name='test_protocol_creation',
            datetime=timezone.now(),
            description='description for my cool dataset',
        )
        p = Protocol.objects.create(
            name='my_cool_protocol',
            compound=c,
            dataset=d,
            subject_id=1
        )


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
