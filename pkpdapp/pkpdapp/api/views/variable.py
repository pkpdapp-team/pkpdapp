#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from pkpdapp.api.views import (
    ProjectFilter,
    DosedPkModelFilter,
    PdModelFilter,
    CheckAccessToProject,
)
from pkpdapp.api.serializers import VariableSerializer
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
