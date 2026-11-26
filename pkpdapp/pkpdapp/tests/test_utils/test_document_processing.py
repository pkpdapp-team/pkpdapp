#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import pkpdapp.tests  # noqa: F401
import tempfile
from datetime import timedelta
from unittest import mock

from django.core.files.base import ContentFile
from django.test import TestCase, override_settings
from django.utils import timezone

from pkpdapp.models import Compound, Document, Project
from pkpdapp.utils import chatbot_documents, document_processing

CHUNKS = [
    {
        "text": "t",
        "raw_text": "t",
        "filename": "up.pdf",
        "chunk_index": 0,
        "pages": [1],
    }
]


class ProcessDocumentTestCase(TestCase):
    def setUp(self):
        media = tempfile.TemporaryDirectory()
        self.addCleanup(media.cleanup)
        override = override_settings(MEDIA_ROOT=media.name)
        override.enable()
        self.addCleanup(override.disable)
        project = Project.objects.create(
            name="mine", compound=Compound.objects.create(name="demo")
        )
        self.document = Document(
            filename="up.pdf",
            project=project,
            status=Document.Status.PROCESSING,
            processing_started_at=timezone.now(),
        )
        self.document.file.save("up.pdf", ContentFile(b"%PDF-1.4"))

        self.chunk_pdf = self.patch("chunk_pdf", return_value=CHUNKS)
        self.add = self.patch_docs("add_project_document", return_value=1)
        self.delete = self.patch_docs("delete_project_document")
        patch = mock.patch("pkpdapp.utils.chatbot.get_client")
        patch.start()
        self.addCleanup(patch.stop)

    def patch(self, name, **kwargs):
        patch = mock.patch.object(document_processing, name, **kwargs)
        self.addCleanup(patch.stop)
        return patch.start()

    def patch_docs(self, name, **kwargs):
        patch = mock.patch.object(document_processing.chatbot_documents, name, **kwargs)
        self.addCleanup(patch.stop)
        return patch.start()

    def reload(self):
        return Document.objects.get(pk=self.document.pk)

    def test_a_processed_document_is_ready(self):
        document_processing.process_document(self.document.id)
        document = self.reload()
        self.assertEqual(document.status, Document.Status.READY)
        self.assertEqual(document.chunk_count, 1)
        self.assertEqual(document.error, "")
        path, filename = self.chunk_pdf.call_args.args
        self.assertEqual(path.read_bytes(), b"%PDF-1.4")
        self.assertEqual(filename, "up.pdf")
        self.assertEqual(self.add.call_args.kwargs["chunks"], CHUNKS)

    def test_a_failure_is_recorded_and_leaves_no_chunks(self):
        self.chunk_pdf.side_effect = ValueError("not readable")
        document_processing.process_document(self.document.id)
        document = self.reload()
        self.assertEqual(document.status, Document.Status.FAILED)
        self.assertEqual(document.error, "not readable")
        self.delete.assert_called_once_with(document_id=document.id)

    def test_an_embedding_failure_is_recorded(self):
        self.add.side_effect = RuntimeError("embedding service down")
        document_processing.process_document(self.document.id)
        self.assertEqual(self.reload().status, Document.Status.FAILED)

    def test_a_long_error_is_cut_short(self):
        self.chunk_pdf.side_effect = ValueError("x" * 5000)
        document_processing.process_document(self.document.id)
        self.assertEqual(len(self.reload().error), chatbot_documents.MAX_ERROR_LENGTH)

    def test_a_failing_clean_up_does_not_hide_the_error(self):
        self.chunk_pdf.side_effect = ValueError("not readable")
        self.delete.side_effect = RuntimeError("qdrant down")
        document_processing.process_document(self.document.id)
        self.assertEqual(self.reload().error, "not readable")

    def test_a_document_deleted_meanwhile_loses_its_chunks(self):
        def delete_then_return(**kwargs):
            Document.objects.filter(pk=self.document.pk).delete()
            return 1

        self.add.side_effect = delete_then_return
        document_processing.process_document(self.document.id)
        self.delete.assert_called_once_with(document_id=self.document.id)

    def test_an_unknown_document_is_ignored(self):
        document_processing.process_document(0)
        self.chunk_pdf.assert_not_called()

    def test_start_processing_runs_in_a_thread(self):
        with mock.patch.object(document_processing, "process_document") as process:
            document_processing.start_processing(7).join(timeout=5)
        process.assert_called_once_with(7)

    def test_mark_processing_resets_the_outcome(self):
        Document.objects.filter(pk=self.document.pk).update(
            status="failed", error="boom", chunk_count=3, processing_started_at=None
        )
        document_processing.mark_processing(self.reload())
        document = self.reload()
        self.assertEqual(document.status, Document.Status.PROCESSING)
        self.assertEqual(document.error, "")
        self.assertIsNone(document.chunk_count)
        self.assertIsNotNone(document.processing_started_at)

    def test_only_old_processing_documents_are_marked_failed(self):
        Document.objects.filter(pk=self.document.pk).update(
            processing_started_at=timezone.now() - timedelta(hours=1)
        )
        self.assertEqual(document_processing.fail_stale_documents(), 0)
        Document.objects.filter(pk=self.document.pk).update(
            processing_started_at=timezone.now() - timedelta(hours=3)
        )
        self.assertEqual(document_processing.fail_stale_documents(), 1)
        self.assertEqual(self.reload().status, Document.Status.FAILED)

    def test_every_processing_document_can_be_marked_failed(self):
        self.assertEqual(document_processing.fail_processing_documents(), 1)
        self.assertEqual(self.reload().status, Document.Status.FAILED)
        self.assertEqual(document_processing.fail_processing_documents(), 0)
