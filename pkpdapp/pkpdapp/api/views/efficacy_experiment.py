#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from pkpdapp.api.views import (
    NotADatasetDose,
    CheckAccessToProject,
)
from pkpdapp.api.serializers import EfficacySerializer
from pkpdapp.models import EfficacyExperiment


class DoseView(viewsets.ModelViewSet):
    queryset = EfficacyExperiment.objects.all()
    serializer_class = EfficacySerializer
    permission_classes = [
        IsAuthenticated & NotADatasetDose & CheckAccessToProject
    ]
