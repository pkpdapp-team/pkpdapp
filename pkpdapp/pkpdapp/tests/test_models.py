#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.test import TestCase
from pkpdapp.models import (
    Dataset, Project, Biomarker, BiomarkerType,
    PharmacodynamicModel, Protocol, PharmacokineticModel,
    PkpdModel, Compound, DosedPharmacokineticModel
)
from django.contrib.auth.models import User
from django.utils import timezone


class TestDatasetModel(TestCase):
    def test_dataset_creation(self):
        d = Dataset.objects.create(
            name='my_cool_dataset',
            datetime=timezone.now(),
            description='description for my cool dataset',
        )
        self.assertTrue(isinstance(d, Dataset))


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


class TestPharmodynamicModel(TestCase):
    def test_model_creation(self):
        m = PharmacodynamicModel.objects.create(
            name='my_cool_model',
            description='description for my cool model',
            sbml='sbml_here',
        )
        self.assertTrue(isinstance(m, PharmacodynamicModel))


class TestDosedPharmokineticModel(TestCase):
    def test_model_creation(self):
        pk = PharmacokineticModel.objects\
            .get(name='one_compartment_pk_model')

        c = Compound.objects.create(
            name='test_dosed_pk_model',
            description='placebo',
        )

        p = Protocol.objects.create(
            name='my_cool_protocol',
            compound=c,
            subject_id=1
        )

        m = DosedPharmacokineticModel.objects.create(
            pharmacokinetic_model=pk,
            dose_compartment='central',
            protocol=p,
        )
        self.assertTrue(isinstance(m, DosedPharmacokineticModel))


class TestPkpdModel(TestCase):
    def test_pkpd_model_creation(self):
        c = Compound.objects.create(
            name='test_pkpd_model_creation',
            description='placebo',
        )

        p = Protocol.objects.create(
            name='my_cool_protocol',
            compound=c,
            subject_id=1
        )
        m = PkpdModel.objects.create(
            name='my_cool_model',
            sbml='sbml_here',
            dose_compartment='central',
            protocol=p,
        )
        self.assertTrue(isinstance(m, PkpdModel))


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
