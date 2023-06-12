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
    PdModelFilter,
)
from pkpdapp.api.serializers import (
    VariableSerializer
)
from pkpdapp.models import Variable


class VariableView(viewsets.ModelViewSet):
    queryset = Variable.objects.all()
    serializer_class = VariableSerializer
    filter_backends = [
        ProjectFilter, DosedPkModelFilter, PdModelFilter
    ]
    permission_classes = [
        IsAuthenticated & CheckAccessToProject
    ]

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='project_id',
                description='Filter results by project ID',
                required=False,
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY
            ),
            OpenApiParameter(
                name='dosed_pk_model_id',
                description='Filter results by dosed_pk_model ID',
                required=False,
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY
            ),
            OpenApiParameter(
                name='pd_model_id',
                description='Filter results by pd_model ID',
                required=False,
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY
            ),
        ],
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

