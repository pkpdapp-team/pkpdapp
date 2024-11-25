#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import pkpdapp.tests  # noqa: F401
import codecs
from django.test import TestCase
import urllib.request
from pkpdapp.models import (
    PharmacodynamicModel,
    PharmacokineticModel,
    Project,
    Compound,
    CombinedModel,
)
from pkpdapp.api.serializers import (
    PharmacodynamicSbmlSerializer, PharmacodynamicSerializer, CombinedModelSerializer
)

BASE_URL_DATASETS = 'https://raw.githubusercontent.com/pkpdapp-team/pkpdapp-datafiles/main/'   # noqa: E501


class TestPdModelSerializer(TestCase):
    def setUp(self):
        compound = Compound.objects.create(name='demo')
        self.project = Project.objects.create(
            name='demo',
            compound=compound
        )

    def test_sbml_serialize(self):
        pd_model = PharmacodynamicModel.objects.create(
            name='test'
        )
        for filename in [
            'usecase2/ABx_updated3.xml'
        ]:
            with urllib.request.urlopen(
                BASE_URL_DATASETS + filename, timeout=5
            ) as f:
                sbml_str = codecs.decode(f.read(), 'utf-8')
                serializer = PharmacodynamicSbmlSerializer(
                    pd_model,
                    data={"sbml": sbml_str},
                    partial=True
                )
                self.assertTrue(serializer.is_valid())
                serializer.save()

    def test_bad_sbml(self):
        pd_model = PharmacodynamicModel.objects.create(
            name='test'
        )
        serializer = PharmacodynamicSbmlSerializer(
            pd_model,
            data={"sbml": "bad sbml"},
            partial=True
        )
        self.assertFalse(serializer.is_valid())

    def test_bad_mmt(self):
        pd_model = PharmacodynamicModel.objects.create(
            name='test'
        )
        serializer = PharmacodynamicSerializer(
            pd_model,
            data={"mmt": "bad sbml"},
            partial=True
        )
        self.assertFalse(serializer.is_valid())


class TestCombinedModelSerializer(TestCase):
    def setUp(self):
        compound = Compound.objects.create(name='demo')
        self.project = Project.objects.create(
            name='demo',
            compound=compound
        )

    def test_combined_model_serializer(self):
        pk_model = PharmacokineticModel.objects.get(name="one_compartment_clinical")
        pd_model = PharmacodynamicModel.objects.get(
            name="indirect_effects_stimulation_production"
        )
        pkpd_model = CombinedModel.objects.create(
            name="my wonderful model",
            pk_model=pk_model,
            pd_model=pd_model,
            project=self.project,
        )
        serializer = CombinedModelSerializer(
            pkpd_model,
            data={
                "name": "my wonderful model",
                "pk_model": pk_model.id,
                "pd_model": pd_model.id,
                "project": self.project.id,
                "time_intervals": [
                    {
                        "start_time": 0,
                        "end_time": 10,
                        "unit": 1
                    }
                ],
                "derived_variables": [
                    {
                        "type": "AUC",
                        "name": "auc",
                        "pk_variable": 1,
                        "unit": 1
                    }
                ]
            },
            partial=True
        )
        self.assertTrue(serializer.is_valid())
        serializer.save()
