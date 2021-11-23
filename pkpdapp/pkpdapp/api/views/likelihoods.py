#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from pkpdapp.api.views import (
    InferenceFilter,
    CheckAccessToProject,
)
from pkpdapp.api.serializers import (
    ObjectiveSerializer
)
from pkpdapp.models import (
    ObjectiveFunction
)


class ObjectiveFunctionView(viewsets.ModelViewSet):
    queryset = ObjectiveFunction.objects.all()
    serializer_class = ObjectiveSerializer
    filter_backends = [
        InferenceFilter
    ]
    permission_classes = [
        IsAuthenticated & CheckAccessToProject
    ]
