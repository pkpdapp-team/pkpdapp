#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from pkpdapp.api.serializers import ProtocolSerializer
from pkpdapp.api.views import (
    ProjectFilter,
    NotADatasetProtocol,
    CheckAccessToProject
)
from pkpdapp.models import Protocol


class ProtocolView(viewsets.ModelViewSet):
    queryset = Protocol.objects.all()
    serializer_class = ProtocolSerializer
    filter_backends = [ProjectFilter]
    permission_classes = [
        IsAuthenticated & NotADatasetProtocol & CheckAccessToProject
    ]
