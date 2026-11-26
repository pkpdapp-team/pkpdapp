#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import os

from django.conf import settings
from rest_framework import serializers

from pkpdapp.models import Document, ProjectAccess

PDF_MAGIC = b"%PDF-"
# The file is stored as documents/<name>, in a column of its own length, and
# a clash makes storage add a suffix of 8 characters.
_STORED_PATH = Document._meta.get_field("file").max_length - len("documents/") - 8
FILENAME_MAX_LENGTH = min(
    Document._meta.get_field("filename").max_length, _STORED_PATH
)


def can_edit_project(user, project) -> bool:
    """Whether the user may change the project's documents: not a read-only
    collaborator, as for the rest of the project's data."""
    return user.is_superuser or ProjectAccess.objects.filter(
        user=user, project=project, read_only=False
    ).exists()


class DocumentSerializer(serializers.ModelSerializer):
    """A document; creating one uploads a PDF to a project."""

    class Meta:
        model = Document
        fields = [
            "id",
            "filename",
            "project",
            "created_at",
            "status",
            "error",
            "chunk_count",
            "file",
        ]
        read_only_fields = [f for f in fields if f not in ("project", "file")]
        extra_kwargs = {"file": {"write_only": True}}

    def validate_project(self, project):
        # shared documents are ingested offline, not uploaded
        if project is None:
            raise serializers.ValidationError("A project is required.")
        if not can_edit_project(self.context["request"].user, project):
            raise serializers.ValidationError(
                "You do not have write access to this project."
            )
        return project

    def validate_file(self, file):
        name = os.path.basename(file.name)
        if not name.lower().endswith(".pdf"):
            raise serializers.ValidationError("Only PDF files can be uploaded.")
        if len(name) > FILENAME_MAX_LENGTH:
            raise serializers.ValidationError("The file name is too long.")
        if file.size > settings.DOCUMENT_UPLOAD_MAX_BYTES:
            limit = settings.DOCUMENT_UPLOAD_MAX_BYTES // (1024 * 1024)
            raise serializers.ValidationError(f"The file is larger than {limit} MB.")
        header = file.read(len(PDF_MAGIC))
        file.seek(0)
        if header != PDF_MAGIC:
            raise serializers.ValidationError("The file is not a PDF.")
        return file

    def validate(self, data):
        project, name = data["project"], os.path.basename(data["file"].name)
        if Document.objects.filter(project=project, filename=name).exists():
            raise serializers.ValidationError(
                {"file": f"This project already has a document named {name}."}
            )
        data["filename"] = name
        return data
