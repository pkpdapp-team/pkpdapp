#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from django.db.models import Q


class Document(models.Model):
    """
    A source document (PDF) that the chatbot can cite. A document with no
    project is shared by everyone; otherwise only users with access to the
    project can see it.
    """

    file = models.FileField(upload_to="documents/")
    filename = models.CharField(
        max_length=255,
        help_text="The name the document's chunks refer to it by.",
    )
    project = models.ForeignKey(
        "Project",
        on_delete=models.CASCADE,
        related_name="documents",
        null=True,
        blank=True,
        help_text="Leave empty for a document shared by all projects.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Status(models.TextChoices):
        PROCESSING = "processing"
        READY = "ready"
        FAILED = "failed"

    # Shared documents are ingested offline, so they default to ready. A project
    # upload is processing until its chunks are searchable.
    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.READY
    )
    error = models.TextField(blank=True, default="")
    chunk_count = models.PositiveIntegerField(null=True, blank=True)
    processing_started_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["project", "filename"],
                name="unique_document_filename_per_project",
            ),
            models.UniqueConstraint(
                fields=["filename"],
                condition=Q(project__isnull=True),
                name="unique_shared_document_filename",
            ),
        ]

    def __str__(self):
        return self.filename
