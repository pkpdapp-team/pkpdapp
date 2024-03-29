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
    LogLikelihoodParameterSerializer, LogLikelihoodSerializer
)
from pkpdapp.models import (
    LogLikelihood, LogLikelihoodParameter
)


class LogLikelihoodView(viewsets.ModelViewSet):
    queryset = LogLikelihood.objects.all()
    serializer_class = LogLikelihoodSerializer
    filter_backends = [
        InferenceFilter
    ]
    permission_classes = [
        IsAuthenticated & CheckAccessToProject
    ]


class LogLikelihoodParameterView(viewsets.ModelViewSet):
    queryset = LogLikelihoodParameter.objects.all()
    serializer_class = LogLikelihoodParameterSerializer
    filter_backends = [
        InferenceFilter
    ]
    permission_classes = [
        IsAuthenticated & CheckAccessToProject
    ]
