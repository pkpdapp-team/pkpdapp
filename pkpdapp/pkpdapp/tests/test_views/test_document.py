#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import pkpdapp.tests  # noqa: F401
import tempfile

from django.contrib.auth.models import User
from django.core.files.base import ContentFile
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from pkpdapp.models import Compound, Document, Project


class DocumentViewTestCase(APITestCase):
    def setUp(self):
        media = tempfile.TemporaryDirectory()
        self.addCleanup(media.cleanup)
        override = override_settings(MEDIA_ROOT=media.name)
        override.enable()
        self.addCleanup(override.disable)

        compound = Compound.objects.create(name="demo")
        self.project = Project.objects.create(name="mine", compound=compound)
        self.other_project = Project.objects.create(
            name="theirs", compound=Compound.objects.create(name="other")
        )
        self.user = User.objects.create_user(username="testuser", password="12345")
        self.project.users.add(self.user)
        self.shared = self.make_document("shared.pdf", None)
        self.mine = self.make_document("mine.pdf", self.project)
        self.theirs = self.make_document("theirs.pdf", self.other_project)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def make_document(self, name, project):
        document = Document(filename=name, project=project)
        document.file.save(name, ContentFile(b"%PDF-1.4 " + name.encode()))
        return document

    def download(self, document):
        return self.client.get(f"/api/documents/{document.id}/download/")

    def test_download_shared_document(self):
        response = self.download(self.shared)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertTrue(response["Content-Disposition"].startswith("inline"))
        self.assertEqual(b"".join(response.streaming_content), b"%PDF-1.4 shared.pdf")

    def test_download_with_the_file_missing_is_a_404(self):
        self.shared.file.storage.delete(self.shared.file.name)
        self.assertEqual(
            self.download(self.shared).status_code, status.HTTP_404_NOT_FOUND
        )

    def test_download_document_of_own_project(self):
        self.assertEqual(self.download(self.mine).status_code, status.HTTP_200_OK)

    def test_cannot_download_document_of_other_project(self):
        self.assertEqual(
            self.download(self.theirs).status_code, status.HTTP_404_NOT_FOUND
        )

    def test_list_hides_other_projects_documents(self):
        response = self.client.get("/api/documents/")
        names = {d["filename"] for d in response.data}
        self.assertEqual(names, {"shared.pdf", "mine.pdf"})

    def test_anonymous_cannot_download(self):
        response = APIClient().get(f"/api/documents/{self.shared.id}/download/")
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )
