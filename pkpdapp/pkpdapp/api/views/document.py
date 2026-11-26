#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import IntegrityError, transaction
from django.db.models import Q
from django.http import FileResponse, Http404
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import APIException, PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from pkpdapp.models import Document
from pkpdapp.api.serializers import DocumentSerializer
from pkpdapp.api.serializers.document import can_edit_project
from pkpdapp.utils.chatbot_documents import document_search_enabled
from pkpdapp.utils.document_processing import (
    fail_stale_documents,
    mark_processing,
    start_processing,
)


class DocumentSearchUnavailable(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = "Document search is not enabled on this server."
    default_code = "document_search_unavailable"


class DocumentViewSet(
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.ReadOnlyModelViewSet,
):
    """Shared documents, plus those of projects the user has access to.

    A user can upload a PDF to a project, which the chatbot can then search,
    and delete the PDFs of their projects. Shared documents are read-only.
    """

    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Document.objects.all()
        return Document.objects.filter(
            Q(project__isnull=True) | Q(project__users=user)
        ).distinct()

    def list(self, request, *args, **kwargs):
        # uploads whose processing was lost (e.g. a restart) are marked failed;
        # checked where the status is read, which a client polls
        fail_stale_documents()
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        fail_stale_documents()
        return super().retrieve(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        if not document_search_enabled():
            raise DocumentSearchUnavailable()
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        try:
            with transaction.atomic():
                document = serializer.save(
                    status=Document.Status.PROCESSING,
                    processing_started_at=timezone.now(),
                )
        except IntegrityError:
            # a simultaneous upload of the same name got in after the check
            raise ValidationError(
                {"file": "This project already has a document of that name."}
            )
        # a thread started now could look for the row before it is committed
        transaction.on_commit(lambda: start_processing(document.id))

    def _get_editable_object(self):
        """The document, if it is one the user may change: not a shared one, and
        not in a project the user can only read."""
        document = self.get_object()
        if document.project_id is None:
            raise PermissionDenied("Shared documents cannot be changed.")
        if not can_edit_project(self.request.user, document.project):
            raise PermissionDenied("You only have read access to this project.")
        return document

    def destroy(self, request, *args, **kwargs):
        self._get_editable_object().delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(request=None, responses=DocumentSerializer)
    @action(detail=True, methods=["post"])
    def retry(self, request, pk=None):
        """Process a failed upload again."""
        if not document_search_enabled():
            raise DocumentSearchUnavailable()
        document = self._get_editable_object()
        if document.status != Document.Status.FAILED:
            return Response(
                {"detail": "Only a failed document can be retried."},
                status=status.HTTP_409_CONFLICT,
            )
        mark_processing(document)
        transaction.on_commit(lambda: start_processing(document.id))
        return Response(self.get_serializer(document).data)

    @action(detail=True, methods=["get"])
    def download(self, request, pk=None):
        document = self.get_object()
        try:
            pdf = document.file.open("rb")
        except (FileNotFoundError, ValueError):  # no file, or none stored
            raise Http404("document file not found")
        return FileResponse(
            pdf,
            content_type="application/pdf",
            filename=document.filename,
        )
