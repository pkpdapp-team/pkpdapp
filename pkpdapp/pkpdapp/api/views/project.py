#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import (
    viewsets, response, parsers, status, decorators
)
from rest_framework.permissions import IsAuthenticated

from pkpdapp.api.serializers import (
    ProjectSerializer,
    ProjectAccessSerializer,
    MonolixSerializer
)
from pkpdapp.api.views import (
    UserAccessFilter,
    CheckAccessToProject
)
from pkpdapp.models import (
    Project,
    ProjectAccess
)


class EnablePartialUpdateMixin:
    """Enable partial updates"""

    def update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return super().update(request, *args, **kwargs)


class ProjectView(EnablePartialUpdateMixin, viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    filter_backends = [UserAccessFilter]

    @decorators.action(
        detail=True,
        methods=['PUT'],
        serializer_class=MonolixSerializer,
        parser_classes=[parsers.MultiPartParser],
    )
    def monolix(self, request, pk):
        obj = self.get_object()
        serializer = self.serializer_class(obj, data=request.data,
                                           partial=True)
        if serializer.is_valid():
            serializer.save()
            return response.Response(serializer.data)
        return response.Response(serializer.errors,
                                 status.HTTP_400_BAD_REQUEST)


class ProjectAccessView(viewsets.ModelViewSet):
    queryset = ProjectAccess.objects.all()
    serializer_class = ProjectAccessSerializer
    permission_classes = [
        IsAuthenticated & CheckAccessToProject
    ]
