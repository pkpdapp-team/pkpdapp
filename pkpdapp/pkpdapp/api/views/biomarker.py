#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from pkpdapp.api.serializers import BiomarkerSerializer
from pkpdapp.api.views import CheckAccessToProject
from pkpdapp.models import Biomarker


class BiomarkerView(viewsets.ModelViewSet):
    queryset = Biomarker.objects.all()
    serializer_class = BiomarkerSerializer
    permission_classes = [
        IsAuthenticated & CheckAccessToProject
    ]
