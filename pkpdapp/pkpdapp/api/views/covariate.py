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
    UserAccessFilter,
)
from pkpdapp.api.serializers import CovariateSerializer
from pkpdapp.models import Covariate


class CovariateView(viewsets.ModelViewSet):
    queryset = Covariate.objects.all()  # this is overridden in the filters
    serializer_class = CovariateSerializer
    filter_backends = [ProjectFilter, UserAccessFilter]
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
        ],
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
