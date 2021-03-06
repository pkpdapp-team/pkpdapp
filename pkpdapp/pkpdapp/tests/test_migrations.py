#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from django_test_migrations.contrib.unittest_case import MigratorTestCase


class Test0005InitialDatasetsReverse(MigratorTestCase):
    migrate_from = ('pkpdapp', '0005_initial_datasets')
    migrate_to = ('pkpdapp', '0001_initial')

    def prepare(self):
        old_dataset = self.old_state.apps.get_model(
            'pkpdapp', 'Dataset'
        )
        self.assertTrue(len(old_dataset.objects.all()) > 0)
        old_biomarker_type = self.old_state.apps.get_model(
            'pkpdapp', 'BiomarkerType'
        )
        self.assertTrue(len(old_biomarker_type.objects.all()) > 0)

    def test_all_datasets_are_deleted(self):
        new_dataset = self.new_state.apps.get_model(
            'pkpdapp', 'Dataset'
        )
        self.assertTrue(len(new_dataset.objects.all()) == 0)

    def test_all_biomarkertype_are_deleted(self):
        new_dataset = self.new_state.apps.get_model(
            'pkpdapp', 'BiomarkerType'
        )
        self.assertTrue(len(new_dataset.objects.all()) == 0)


class Test0006InitialPkpdModelsReverse(MigratorTestCase):
    migrate_from = ('pkpdapp', '0006_initial_pkpd_models')
    migrate_to = ('pkpdapp', '0001_initial')

    def prepare(self):
        old_pd_models = self.old_state.apps.get_model(
            'pkpdapp', 'PharmacodynamicModel'
        )
        self.assertTrue(len(old_pd_models.objects.all()) > 0)

    def test_all_pkpd_models_are_deleted(self):
        new_pd_models = self.old_state.apps.get_model(
            'pkpdapp', 'PharmacodynamicModel'
        )
        self.assertTrue(len(new_pd_models.objects.all()) == 0)


class Test0003InitialUsersProjectReverse(MigratorTestCase):
    migrate_from = ('pkpdapp', '0003_initial_users_and_projects')
    migrate_to = ('pkpdapp', '0001_initial')

    def prepare(self):
        old_projects = self.old_state.apps.get_model(
            'pkpdapp', 'Project'
        )
        old_users = self.old_state.apps.get_model(
            'auth', 'User'
        )
        self.assertTrue(len(old_projects.objects.all()) > 0)
        self.assertTrue(len(old_users.objects.filter(is_superuser=False)) > 0)

    def test_all_users_and_projects_are_deleted(self):
        new_projects = self.new_state.apps.get_model(
            'pkpdapp', 'Project'
        )
        new_users = self.new_state.apps.get_model(
            'auth', 'User'
        )
        self.assertTrue(len(new_projects.objects.all()) == 0)
        self.assertTrue(
            len(new_users.objects.filter(is_superuser=False)) == 0
        )
