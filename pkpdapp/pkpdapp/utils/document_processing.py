#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
"""Make an uploaded project document searchable, in a background thread.

Reading a PDF takes from seconds to minutes, so the upload returns at once with
the document `processing`, and a thread chunks and embeds it, then marks it
`ready` or `failed`. There is no task queue: a thread lives and dies with its
gunicorn worker, so a document whose worker was restarted stays `processing`
until `fail_stale_documents` marks it failed, and the user can retry it.
"""
import logging
import threading
from datetime import timedelta
from pathlib import Path

from django.db import close_old_connections, connection
from django.utils import timezone

from pkpdapp.models import Document
from pkpdapp.utils import chatbot_documents
from pkpdapp.utils.document_chunking import chunk_pdf

logger = logging.getLogger(__name__)

# docling uses a lot of memory, so one conversion at a time per process
_conversion_slot = threading.Semaphore(1)
# longer than any conversion should take
STALE_AFTER = timedelta(hours=2)


def mark_processing(document: Document) -> None:
    document.status = Document.Status.PROCESSING
    document.error = ""
    document.chunk_count = None
    document.processing_started_at = timezone.now()
    document.save(
        update_fields=["status", "error", "chunk_count", "processing_started_at"]
    )


def fail_processing_documents(started_before=None) -> int:
    """Mark documents that are still processing as failed, e.g. because their
    thread is gone; only those started before the given time, if one is given."""
    documents = Document.objects.filter(status=Document.Status.PROCESSING)
    if started_before is not None:
        documents = documents.filter(processing_started_at__lt=started_before)
    return documents.update(
        status=Document.Status.FAILED, error="Processing was interrupted."
    )


def fail_stale_documents() -> int:
    """Mark documents whose processing never finished as failed."""
    return fail_processing_documents(started_before=timezone.now() - STALE_AFTER)


def process_document(document_id: int) -> None:
    """Chunk and embed a document, and record how it went. Never raises."""
    # imported here: chatbot imports chatbot_documents, which imports models
    from pkpdapp.utils.chatbot import get_client

    document = Document.objects.filter(pk=document_id).first()
    if document is None:
        return
    try:
        with _conversion_slot:
            chunks = chunk_pdf(Path(document.file.path), document.filename)
        count = chatbot_documents.add_project_document(
            client=get_client(), document=document, chunks=chunks
        )
    except Exception as error:
        logger.exception(f"could not process document {document_id}")
        chatbot_documents.record_failure(document_id=document_id, error=error)
        return
    updated = Document.objects.filter(pk=document_id).update(
        status=Document.Status.READY, error="", chunk_count=count
    )
    if not updated:
        # deleted while it was processing
        chatbot_documents.delete_project_document(document_id=document_id)


def _run(document_id: int) -> None:
    try:
        process_document(document_id)
    finally:
        # a thread's database connection is not closed for it
        close_old_connections()
        connection.close()


def start_processing(document_id: int) -> threading.Thread:
    thread = threading.Thread(
        target=_run,
        args=(document_id,),
        name=f"process-document-{document_id}",
        daemon=True,
    )
    thread.start()
    return thread
