#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import pkpdapp.tests  # noqa: F401
import tempfile

from django.contrib.auth.models import User
from unittest import mock

from django.core.files.base import ContentFile
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from pkpdapp.api.serializers import DocumentSerializer
from pkpdapp.models import Compound, Document, Project, ProjectAccess


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


PDF = b"%PDF-1.4 uploaded"


@override_settings(QDRANT_URL="http://qdrant:6333", CHATBOT_EMBEDDING_MODEL="model")
class DocumentUploadTestCase(DocumentViewTestCase):
    def setUp(self):
        super().setUp()
        patch = mock.patch("pkpdapp.api.views.document.start_processing")
        self.start_processing = patch.start()
        self.addCleanup(patch.stop)

    def upload(self, name="new.pdf", content=PDF, project=None, **kwargs):
        project = project or self.project
        data = {"file": SimpleUploadedFile(name, content, "application/pdf")}
        if project != "none":
            data["project"] = project.id
        with self.captureOnCommitCallbacks(execute=True):
            return self.client.post("/api/documents/", data, format="multipart")

    def test_upload_to_own_project_starts_processing(self):
        response = self.upload()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["filename"], "new.pdf")
        self.assertEqual(response.data["status"], "processing")
        self.assertNotIn("file", response.data)
        document = Document.objects.get(filename="new.pdf")
        self.assertEqual(document.project, self.project)
        self.assertIsNotNone(document.processing_started_at)
        self.start_processing.assert_called_once_with(document.id)

    def test_upload_to_another_project_is_refused(self):
        response = self.upload(project=self.other_project)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Document.objects.filter(filename="new.pdf").exists())
        self.start_processing.assert_not_called()

    def test_upload_needs_a_project(self):
        response = self.upload(project="none")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_upload_refuses_anything_but_a_pdf(self):
        for name, content in [("a.txt", PDF), ("a.pdf", b"not a pdf")]:
            response = self.upload(name=name, content=content)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, name)
        self.start_processing.assert_not_called()

    @override_settings(DOCUMENT_UPLOAD_MAX_BYTES=10)
    def test_upload_refuses_a_file_that_is_too_large(self):
        response = self.upload()
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("larger than", str(response.data))

    def test_upload_refuses_a_name_too_long_to_store(self):
        response = self.upload(name="x" * 90 + ".pdf")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            self.upload(name="x" * 70 + ".pdf").status_code, status.HTTP_201_CREATED
        )

    def test_a_simultaneous_upload_of_the_same_name_is_refused_not_a_500(self):
        # the duplicate check passed, as it would for two requests at once
        with mock.patch.object(
            DocumentSerializer,
            "validate",
            side_effect=lambda data: {**data, "filename": "mine.pdf"},
        ):
            response = self.upload(name="mine.pdf")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.start_processing.assert_not_called()

    def test_upload_refuses_a_name_the_project_already_has(self):
        response = self.upload(name="mine.pdf")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_two_projects_can_upload_the_same_name(self):
        self.other_project.users.add(self.user)
        self.assertEqual(self.upload().status_code, status.HTTP_201_CREATED)
        response = self.upload(project=self.other_project)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    @override_settings(QDRANT_URL=None)
    def test_upload_is_unavailable_without_document_search(self):
        response = self.upload()
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    def test_upload_needs_a_login(self):
        self.client.force_authenticate(user=None)
        self.assertIn(
            self.upload().status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )

    def make_read_only(self):
        ProjectAccess.objects.filter(user=self.user, project=self.project).update(
            read_only=True
        )

    def test_a_read_only_collaborator_cannot_upload(self):
        self.make_read_only()
        self.assertEqual(self.upload().status_code, status.HTTP_400_BAD_REQUEST)
        self.start_processing.assert_not_called()

    def test_a_read_only_collaborator_cannot_delete_or_retry(self):
        self.make_read_only()
        Document.objects.filter(pk=self.mine.pk).update(status="failed")
        response = self.client.delete(f"/api/documents/{self.mine.id}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.retry(self.mine).status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Document.objects.filter(pk=self.mine.pk).exists())

    def test_a_read_only_collaborator_can_still_download(self):
        self.make_read_only()
        self.assertEqual(self.download(self.mine).status_code, status.HTTP_200_OK)

    def test_delete_own_project_document(self):
        response = self.client.delete(f"/api/documents/{self.mine.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Document.objects.filter(pk=self.mine.pk).exists())

    def test_delete_removes_the_stored_file_and_chunks(self):
        storage, name = self.mine.file.storage, self.mine.file.name
        # the mock must outlive the on-commit callbacks, which run on exit
        with (
            mock.patch(
                "pkpdapp.utils.chatbot_documents.delete_project_document"
            ) as delete_chunks,
            self.captureOnCommitCallbacks(execute=True),
        ):
            self.client.delete(f"/api/documents/{self.mine.id}/")
        self.assertFalse(storage.exists(name))
        delete_chunks.assert_called_once_with(document_id=self.mine.id)

    def test_deleting_a_project_removes_its_documents_chunks(self):
        # the mock must outlive the on-commit callbacks, which run on exit
        with (
            mock.patch(
                "pkpdapp.utils.chatbot_documents.delete_project_document"
            ) as delete_chunks,
            self.captureOnCommitCallbacks(execute=True),
        ):
            self.project.delete()
        delete_chunks.assert_called_once_with(document_id=self.mine.id)

    def test_cannot_delete_a_shared_document(self):
        response = self.client.delete(f"/api/documents/{self.shared.id}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Document.objects.filter(pk=self.shared.pk).exists())

    def test_cannot_delete_another_projects_document(self):
        response = self.client.delete(f"/api/documents/{self.theirs.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_cannot_change_a_document(self):
        response = self.client.patch(
            f"/api/documents/{self.mine.id}/", {"status": "failed"}
        )
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def retry(self, document):
        with self.captureOnCommitCallbacks(execute=True):
            return self.client.post(f"/api/documents/{document.id}/retry/")

    def test_retry_processes_a_failed_document_again(self):
        Document.objects.filter(pk=self.mine.pk).update(status="failed", error="boom")
        response = self.retry(self.mine)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data["status"], "processing")
        self.assertEqual(response.data["error"], "")
        self.start_processing.assert_called_once_with(self.mine.id)

    def test_retry_refuses_a_document_that_did_not_fail(self):
        response = self.retry(self.mine)
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.start_processing.assert_not_called()

    def test_retry_refuses_shared_and_other_projects_documents(self):
        Document.objects.filter(pk__in=[self.shared.pk, self.theirs.pk]).update(
            status="failed"
        )
        self.assertEqual(
            self.retry(self.shared).status_code, status.HTTP_403_FORBIDDEN
        )
        self.assertEqual(
            self.retry(self.theirs).status_code, status.HTTP_404_NOT_FOUND
        )

    def test_listing_marks_abandoned_processing_as_failed(self):
        from datetime import timedelta
        from django.utils import timezone

        Document.objects.filter(pk=self.mine.pk).update(
            status="processing",
            processing_started_at=timezone.now() - timedelta(hours=3),
        )
        response = self.client.get(f"/api/documents/{self.mine.id}/")
        self.assertEqual(response.data["status"], "failed")
        self.assertIn("interrupted", response.data["error"])
