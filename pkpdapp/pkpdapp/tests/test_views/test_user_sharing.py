#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from unittest import mock

from django.contrib.auth.models import User
from django.core import mail
from rest_framework.test import APIClient, APITestCase

from pkpdapp.models import Compound, Project, ProjectAccess


class FakePredi:
    class Result:
        def __init__(self, username, email=""):
            self.username = username
            self.email = email
            self.first_name = "Dir"
            self.last_name = "Ectory"

    def search_users(self, q):
        return [self.Result("alice", "a@x.com"), self.Result("bob", "bob@x.com")]

    def get_user_details(self, username):
        return {
            "email": f"{username}@x.com",
            "first_name": "Bob",
            "last_name": "B",
            "department": "PK",
        }


class TestUserSharing(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="owner", password="x", email="o@x.com"
        )
        self.existing = User.objects.create_user(
            username="alice", password="x", email="a@x.com"
        )
        self.project = Project.objects.create(
            name="p", compound=Compound.objects.create(name="c")
        )
        ProjectAccess.objects.create(project=self.project, user=self.owner)
        self.client = APIClient()
        self.client.force_authenticate(user=self.owner)
        patcher = mock.patch(
            "pkpdapp.api.views.user._predilogin", return_value=FakePredi()
        )
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_search_merges_and_dedupes(self):
        r = self.client.get("/api/user/search/", {"q": "ali"})
        self.assertEqual(r.status_code, 200)
        by_name = {u["username"]: u for u in r.data}
        self.assertEqual(by_name["alice"]["id"], self.existing.id)
        self.assertIsNone(by_name["bob"]["id"])
        self.assertEqual(len(r.data), 2)

    def test_search_min_length(self):
        r = self.client.get("/api/user/search/", {"q": "al"})
        self.assertEqual(r.data, [])

    def test_placeholder_idempotent_and_inactive(self):
        r = self.client.post("/api/user/placeholder/", {"username": "bob"})
        self.assertEqual(r.status_code, 201)
        user = User.objects.get(username="bob")
        self.assertFalse(user.is_active)
        self.assertFalse(user.has_usable_password())
        self.assertTrue(user.profile.is_placeholder)
        self.assertEqual(user.email, "bob@x.com")
        r = self.client.post("/api/user/placeholder/", {"username": "BOB"})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(User.objects.filter(username__iexact="bob").count(), 1)

    def _put(self, access):
        data = {
            "name": "p",
            "user_access": access,
        }
        return self.client.put(f"/api/project/{self.project.id}/", data, format="json")

    def test_share_sends_email_once(self):
        access = [
            {"user": self.owner.id, "read_only": False},
            {"user": self.existing.id, "read_only": True},
        ]
        with self.captureOnCommitCallbacks(execute=True):
            r = self._put(access)
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["a@x.com"])
        with self.captureOnCommitCallbacks(execute=True):
            self._put(access)
        self.assertEqual(len(mail.outbox), 1)

    def test_share_skips_user_without_email(self):
        noemail = User.objects.create_user(username="ne", password="x")
        with self.captureOnCommitCallbacks(execute=True):
            self._put(
                [
                    {"user": self.owner.id, "read_only": False},
                    {"user": noemail.id, "read_only": False},
                ]
            )
        self.assertEqual(len(mail.outbox), 0)
        self.assertTrue(
            ProjectAccess.objects.filter(project=self.project, user=noemail).exists()
        )

    def test_placeholder_rejects_deactivated_user(self):
        User.objects.create_user(username="gone", password="x", is_active=False)
        r = self.client.post("/api/user/placeholder/", {"username": "gone"})
        self.assertEqual(r.status_code, 400)
