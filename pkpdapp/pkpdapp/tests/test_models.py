from django.test import TestCase
from pkpdapp.models import (
    Dataset, Project, Biomarker, BiomarkerType, PkpdModel
)
from django.contrib.auth.models import User
from django.utils import timezone


class TestDatasetModel(TestCase):
    def test_dataset_creation(self):
        d = Dataset.objects.create(
            name='my_cool_dataset',
            description='description for my cool dataset',
            administration_type='T1',
        )
        self.assertTrue(isinstance(d, Dataset))


class TestBiomarkerTypeModel(TestCase):
    def test_biomarker_type_creation(self):
        bt = BiomarkerType.objects.create(
            name='my_cool_biomarker_type',
            description='description for my cool biomarker_type',
            unit='mg',
        )
        self.assertTrue(isinstance(bt, BiomarkerType))


class TestBiomarkerModel(TestCase):
    def test_biomarker_creation(self):
        d = Dataset.objects.create(
            name='my_cool_dataset',
            description='description for my cool biomarker',
            administration_type='T1',
        )
        b = Biomarker.objects.create(
            time=timezone.now(),
            value=1.0,
            biomarker_type=BiomarkerType.objects.get(name='concentration'),
            dataset=d,
        )
        self.assertTrue(isinstance(b, Biomarker))


class TestPkpdModel(TestCase):
    def test_pkpd_model_creation(self):
        m = PkpdModel.objects.create(
            name='my_cool_model',
            description='description for my cool model',
            model_type='PK',
            sbml='sbml_here',
        )
        self.assertTrue(isinstance(m, PkpdModel))


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
            description='description for my cool dataset',
            administration_type='T1',
        )
        p.datasets.add(d)
        self.assertQuerysetEqual(p.datasets.all(), [repr(d)])

        m = PkpdModel.objects.create(
            name='my_cool_model',
            description='description for my cool model',
            model_type='PK',
            sbml='sbml_here',
        )
        p.pkpd_models.add(m)
        self.assertQuerysetEqual(p.pkpd_models.all(), [repr(m)])

        u = User.objects.create_user(
            'john', 'lennon@thebeatles.com', 'johnpassword'
        )
        p.users.add(u)
        self.assertQuerysetEqual(p.users.all(), [repr(u)])
