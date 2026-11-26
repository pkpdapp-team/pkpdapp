#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import logging

from django.db import transaction

logger = logging.getLogger(__name__)


def delete_document_data(sender, instance, **kwargs):
    """Remove a deleted Document's file and, for a project's, its chunks.

    Runs for cascades too, e.g. when a project is deleted. Failures are logged
    and not raised, so they never block the delete itself.
    """
    file_name = instance.file.name if instance.file else ""
    storage = instance.file.storage
    document_id = instance.id
    is_project_document = instance.project_id is not None

    def cleanup():
        if file_name:
            try:
                storage.delete(file_name)
            except Exception:
                logger.exception(f"could not delete the file {file_name}")
        if is_project_document:
            # imported here: this pulls in the qdrant and portkey clients
            from pkpdapp.utils import chatbot_documents

            if not chatbot_documents.document_search_enabled():
                return
            try:
                chatbot_documents.delete_project_document(document_id=document_id)
            except Exception:
                logger.exception(
                    f"could not delete the chunks of document {document_id}"
                )

    # only once the delete is committed, so a rollback keeps both
    transaction.on_commit(cleanup)
