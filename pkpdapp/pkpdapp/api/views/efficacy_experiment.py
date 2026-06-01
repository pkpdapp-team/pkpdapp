#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from pkpdapp.api.views import (
    CheckAccessToProject,
)
from pkpdapp.api.serializers import EfficacyExperimentSerializer
from pkpdapp.models import EfficacyExperiment
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes


class EfficacyExperimentView(viewsets.ModelViewSet):
    queryset = EfficacyExperiment.objects.all()
    serializer_class = EfficacyExperimentSerializer
    permission_classes = [
        IsAuthenticated & CheckAccessToProject
    ]

    def get_queryset(self):
        queryset = super().get_queryset()
        if not self.request.user.is_superuser:
            queryset = queryset.filter(
                compound__project__projectaccess__user=self.request.user
            ).distinct()

        compound_id = self.request.query_params.get("compound_id")
        if compound_id is not None:
            try:
                compound_id = int(compound_id)
            except (TypeError, ValueError):
                raise ValidationError({"compound_id": "Must be an integer."})
            queryset = queryset.filter(compound__id=compound_id)
        return queryset

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="compound_id",
                description="Filter results by compound ID",
                required=False,
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
            ),
        ],
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
