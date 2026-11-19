#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
"""
Behavioural tests for ``Project.copy`` that complement the field-by-field
round trip in test_copy_roundtrip.py: edge-case projects, independence of the
copy, access handling, atomicity and the API endpoint.
"""
from unittest import mock

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from pkpdapp import models as m
from pkpdapp.tests.copy_fixtures import build_maximal_project


def make_empty_project(name="empty"):
    compound = m.Compound.objects.create(name=name, compound_type="LM")
    return m.Project.objects.create(name=name, compound=compound)


class TestCopyEdgeCases(TestCase):
    def test_project_with_nothing_in_it(self):
        project = make_empty_project()
        new_project = project.copy()
        self.assertNotEqual(new_project.pk, project.pk)
        self.assertNotEqual(new_project.compound_id, project.compound_id)
        self.assertEqual(new_project.name, "Copy of empty")
        self.assertEqual(new_project.datasets.count(), 0)

    def test_project_with_model_but_no_dataset(self):
        project = make_empty_project()
        m.CombinedModel.objects.create(
            name="model",
            project=project,
            pk_model=m.PharmacokineticModel.objects.get(name="1-compartmental model"),
        )
        new_project = project.copy()
        self.assertEqual(new_project.pk_models.count(), 1)
        self.assertEqual(new_project.datasets.count(), 0)

    def test_protocol_uses_the_new_projects_compound(self):
        project = make_empty_project()
        model = m.CombinedModel.objects.create(
            name="model",
            project=project,
            pk_model=m.PharmacokineticModel.objects.get(name="1-compartmental model"),
        )
        m.Protocol.objects.create(
            name="protocol",
            project=project,
            compound=project.compound,
            variable=model.variables.get(qname="PKCompartment.A1"),
        )
        new_project = project.copy()
        new_protocol = new_project.protocols.get(name="protocol")
        self.assertEqual(new_protocol.compound, new_project.compound)

    def test_use_efficacy_points_at_the_copied_experiment(self):
        project = make_empty_project()
        h = m.Unit.objects.get(symbol="h")
        chosen = m.EfficacyExperiment.objects.create(
            name="chosen", c50=1.0, c50_unit=h, compound=project.compound
        )
        m.EfficacyExperiment.objects.create(
            name="other", c50=2.0, c50_unit=h, compound=project.compound
        )
        project.compound.use_efficacy = chosen
        project.compound.save()

        new_compound = project.copy().compound
        self.assertEqual(new_compound.use_efficacy.name, "chosen")
        self.assertEqual(new_compound.use_efficacy.compound, new_compound)
        self.assertNotEqual(new_compound.use_efficacy_id, chosen.id)


class TestCopyIndependence(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.project = build_maximal_project()
        cls.first = cls.project.copy()
        cls.second = cls.project.copy()

    def test_copies_share_no_per_project_rows(self):
        def ids(project):
            return {
                "compound": {project.compound_id},
                "datasets": set(project.datasets.values_list("pk", flat=True)),
                "groups": set(project.groups.values_list("pk", flat=True)),
                "covariates": set(project.covariates.values_list("pk", flat=True)),
                "models": set(project.pk_models.values_list("pk", flat=True)),
                "protocols": set(project.protocols.values_list("pk", flat=True)),
                "simulations": set(project.simulations.values_list("pk", flat=True)),
                "results": set(project.results.values_list("pk", flat=True)),
                "variables": {
                    v.pk for mod in project.pk_models.all() for v in mod.variables.all()
                },
                "doses": set(
                    m.Dose.objects.filter(protocol__project=project).values_list(
                        "pk", flat=True
                    )
                ),
                "subjects": set(
                    m.Subject.objects.filter(dataset__project=project).values_list(
                        "pk", flat=True
                    )
                ),
            }

        original, first, second = (
            ids(self.project),
            ids(self.first),
            ids(self.second),
        )
        for kind in original:
            self.assertTrue(original[kind], f"fixture has no {kind}")
            self.assertEqual(len(original[kind]), len(first[kind]), kind)
            self.assertEqual(len(original[kind]), len(second[kind]), kind)
            self.assertFalse(original[kind] & first[kind], kind)
            self.assertFalse(original[kind] & second[kind], kind)
            self.assertFalse(first[kind] & second[kind], kind)

    def test_deleting_the_copy_leaves_the_original_intact(self):
        project = m.Project.objects.get(
            pk=self.project.pk
        )
        before = (
            project.protocols.count(),
            project.pk_models.count(),
            m.Subject.objects.filter(dataset__project=project).count(),
            project.compound.efficacy_experiments.count(),
        )
        to_delete = project.copy()
        compound = to_delete.compound
        to_delete.delete()
        compound.delete()
        project.refresh_from_db()
        after = (
            project.protocols.count(),
            project.pk_models.count(),
            m.Subject.objects.filter(dataset__project=project).count(),
            project.compound.efficacy_experiments.count(),
        )
        self.assertEqual(before, after)
        self.assertEqual(
            project.compound.use_efficacy.name, "efficacy experiment"
        )

    def test_editing_the_copy_does_not_change_the_original(self):
        new_model = self.first.pk_models.first()
        old_model = self.project.pk_models.first()
        variable = new_model.variables.get(qname="PKCompartment.CL")
        old_default = old_model.variables.get(qname="PKCompartment.CL").default_value
        variable.default_value = old_default + 100.0
        variable.save()
        self.assertEqual(
            old_model.variables.get(qname="PKCompartment.CL").default_value,
            old_default,
        )


class TestCopyAccess(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="owner", password="x")
        self.reader = User.objects.create_user(username="reader", password="x")
        self.copier = User.objects.create_user(username="copier", password="x")
        self.project = make_empty_project()
        m.ProjectAccess.objects.create(
            user=self.owner, project=self.project, read_only=False
        )
        m.ProjectAccess.objects.create(
            user=self.reader, project=self.project, read_only=True
        )

    def test_copy_without_user_mirrors_access(self):
        new_project = self.project.copy()
        access = {
            (a.user.username, a.read_only) for a in new_project.projectaccess_set.all()
        }
        self.assertEqual(access, {("owner", False), ("reader", True)})

    def test_copy_with_user_gives_only_that_user_write_access(self):
        new_project = self.project.copy(user=self.copier)
        access = list(new_project.projectaccess_set.all())
        self.assertEqual(len(access), 1)
        self.assertEqual(access[0].user, self.copier)
        self.assertFalse(access[0].read_only)
        # the original's access list is untouched
        self.assertEqual(self.project.projectaccess_set.count(), 2)


class TestCopyAtomicity(TestCase):
    def test_failure_part_way_leaves_nothing_behind(self):
        project = build_maximal_project()
        counts = (
            m.Project.objects.count(),
            m.Compound.objects.count(),
            m.Dataset.objects.count(),
            m.CombinedModel.objects.count(),
            m.Protocol.objects.count(),
        )
        with mock.patch.object(
            m.Simulation, "copy", side_effect=RuntimeError("boom")
        ):
            with self.assertRaises(RuntimeError):
                project.copy()
        self.assertEqual(
            counts,
            (
                m.Project.objects.count(),
                m.Compound.objects.count(),
                m.Dataset.objects.count(),
                m.CombinedModel.objects.count(),
                m.Protocol.objects.count(),
            ),
        )


class TestCopyApi(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="api_user", password="x")
        self.other = User.objects.create_user(username="other_user", password="x")
        self.project = make_empty_project()
        m.Dataset.objects.create(name="ds", project=self.project)
        m.ProjectAccess.objects.create(user=self.user, project=self.project)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_copy_returns_a_new_project_owned_by_the_requester(self):
        response = self.client.put(f"/api/project/{self.project.pk}/copy/")
        self.assertEqual(response.status_code, 200, response.content)
        new_project = m.Project.objects.get(pk=response.data["id"])
        self.assertNotEqual(new_project.pk, self.project.pk)
        self.assertEqual(new_project.name, "Copy of empty")
        self.assertEqual(
            list(new_project.projectaccess_set.values_list("user__username", "read_only")),
            [("api_user", False)],
        )

    def test_user_without_access_cannot_copy(self):
        self.client.force_authenticate(user=self.other)
        before = m.Project.objects.count()
        response = self.client.put(f"/api/project/{self.project.pk}/copy/")
        self.assertIn(response.status_code, (403, 404))
        self.assertEqual(m.Project.objects.count(), before)

    def test_unauthenticated_cannot_copy(self):
        self.client.force_authenticate(user=None)
        before = m.Project.objects.count()
        response = self.client.put(f"/api/project/{self.project.pk}/copy/")
        self.assertIn(response.status_code, (401, 403))
        self.assertEqual(m.Project.objects.count(), before)
