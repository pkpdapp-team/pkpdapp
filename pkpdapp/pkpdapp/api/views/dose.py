#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from pkpdapp.api.views import (
    CheckAccessToProject,
)
from pkpdapp.api.serializers import DoseSerializer
from pkpdapp.models import Dose


class DoseView(viewsets.ModelViewSet):
    queryset = Dose.objects.all()
    serializer_class = DoseSerializer
    permission_classes = [
        IsAuthenticated & CheckAccessToProject
    ]
