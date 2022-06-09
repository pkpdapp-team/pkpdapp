#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import viewsets
from pkpdapp.api.views import (
    DosedPkModelFilter,
    PdModelFilter,
)
from pkpdapp.api.serializers import UnitSerializer
from pkpdapp.models import Unit


class UnitView(viewsets.ModelViewSet):
    queryset = Unit.objects.all()
    serializer_class = UnitSerializer
    filter_backends = [DosedPkModelFilter, PdModelFilter]
