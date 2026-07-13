#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from pkpdapp.api.views import (
    ProjectFilter,
    CheckAccessToProject,
    DosedPkModelFilter,
)
from pkpdapp.api.serializers import CorrelationSerializer
from pkpdapp.models import Correlation


class CorrelationView(viewsets.ModelViewSet):
    queryset = Correlation.objects.all()  # this is overridden in the filters
    serializer_class = CorrelationSerializer
    filter_backends = [ProjectFilter, DosedPkModelFilter]
    permission_classes = [IsAuthenticated & CheckAccessToProject]

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="project_id",
                description="Filter results by project ID",
                required=False,
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
            ),
            OpenApiParameter(
                name="dosed_pk_model_id",
                description="Filter results by dosed_pk_model ID",
                required=False,
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
            ),
        ],
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
