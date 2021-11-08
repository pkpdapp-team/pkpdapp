#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import viewsets
from pkpdapp.api.views import (
    ProjectFilter,
)
from pkpdapp.api.serializers import BiomarkerTypeSerializer
from pkpdapp.models import BiomarkerType


class BiomarkerTypeView(viewsets.ModelViewSet):
    queryset = BiomarkerType.objects.all()
    serializer_class = BiomarkerTypeSerializer
    filter_backends = [ProjectFilter]
