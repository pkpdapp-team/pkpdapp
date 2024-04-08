#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from pkpdapp.api.serializers import BiomarkerTypeSerializer
from pkpdapp.api.views import DatasetFilter, ProjectFilter
from pkpdapp.api.views import CheckAccessToProject
from pkpdapp.models import BiomarkerType


class BiomarkerTypeView(viewsets.ModelViewSet):
    queryset = BiomarkerType.objects.all()
    serializer_class = BiomarkerTypeSerializer
    filter_backends = [DatasetFilter, ProjectFilter]
    permission_classes = [
        IsAuthenticated & CheckAccessToProject
    ]

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='dataset_id',
                description='Filter results by dataset ID',
                required=False,
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY
            ),
        ],
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
