#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import (
    viewsets
)
from rest_framework.permissions import IsAuthenticated

from pkpdapp.api.serializers import (
    ProjectSerializer,
    ProjectAccessSerializer
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


class ProjectAccessView(viewsets.ModelViewSet):
    queryset = ProjectAccess.objects.all()
    serializer_class = ProjectAccessSerializer
    permission_classes = [
        IsAuthenticated & CheckAccessToProject
    ]
