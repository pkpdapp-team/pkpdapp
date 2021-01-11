#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from django_test_migrations.contrib.unittest_case import MigratorTestCase


class Test0002InitialBiomarkerTypeReverse(MigratorTestCase):
    migrate_from = ('pkpdapp', '0002_initial_biomarker_types')
    migrate_to = ('pkpdapp', '0001_initial')

    def prepare(self):
        old_biomarker_types = self.old_state.apps.get_model(
            'pkpdapp', 'BiomarkerType'
        )
        self.assertTrue(len(old_biomarker_types.objects.all()) > 0)

    def test_all_biomarkertypes_are_deleted(self):
        new_biomarker_types = self.new_state.apps.get_model(
            'pkpdapp', 'BiomarkerType'
        )
        self.assertTrue(len(new_biomarker_types.objects.all()) == 0)

class Test0005InitialDatasetsReverse(MigratorTestCase):
    migrate_from = ('pkpdapp', '0005_initial_biomarker_types')
    migrate_to = ('pkpdapp', '0002_initial')

    def prepare(self):
        old_dataset = self.old_state.apps.get_model(
            'pkpdapp', 'Dataset'
        )
        self.assertTrue(len(old_dataset.objects.all()) > 0)
        old_biomarker_map = self.old_state.apps.get_model(
            'pkpdapp', 'BiomarkerMap'
        )
        self.assertTrue(len(old_biomarker_map.objects.all()) > 0)

    def test_all_datasets_are_deleted(self):
        new_dataset = self.new_state.apps.get_model(
            'pkpdapp', 'Dataset'
        )
        self.assertTrue(len(new_dataset.objects.all()) == 0)

    def test_all_biomarkermaps_are_deleted(self):
        new_dataset = self.new_state.apps.get_model(
            'pkpdapp', 'BiomarkerMap'
        )
        self.assertTrue(len(new_dataset.objects.all()) == 0)
