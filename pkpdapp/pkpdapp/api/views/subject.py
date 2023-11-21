#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import viewsets
from pkpdapp.api.views import (
    ProjectFilter,
)
from pkpdapp.api.serializers import SubjectSerializer
from pkpdapp.models import Subject


class SubjectView(viewsets.ModelViewSet):
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    filter_backends = [ProjectFilter]
