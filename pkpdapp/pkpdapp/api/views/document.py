#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db.models import Q
from django.http import FileResponse, Http404
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from pkpdapp.models import Document
from pkpdapp.api.serializers import DocumentSerializer


class DocumentViewSet(viewsets.ReadOnlyModelViewSet):
    """Shared documents, plus those of projects the user has access to."""

    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Document.objects.all()
        return Document.objects.filter(
            Q(project__isnull=True) | Q(project__users=user)
        ).distinct()

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
