#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import viewsets
from pkpdapp.api.serializers import CompoundSerializer
from pkpdapp.models import Compound
from pkpdapp.api.views import (
    CheckAccessToProject
)
from rest_framework.permissions import IsAuthenticated

class CompoundView(viewsets.ModelViewSet):
    queryset = Compound.objects.all()
    serializer_class = CompoundSerializer
    permission_classes = [
        IsAuthenticated & CheckAccessToProject
    ]