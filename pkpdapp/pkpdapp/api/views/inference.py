#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import viewsets
from pkpdapp.api.views import (
    ProjectFilter, InferenceFilter
)
from pkpdapp.api.serializers import (
    InferenceSerializer,
    InferenceChainSerializer,
    AlgorithmSerializer,
)
from pkpdapp.models import Inference, InferenceChain, Algorithm


class AlgorithmView(viewsets.ModelViewSet):
    queryset = Algorithm.objects.all()
    serializer_class = AlgorithmSerializer


class InferenceView(viewsets.ModelViewSet):
    queryset = Inference.objects.all()
    serializer_class = InferenceSerializer
    filter_backends = [ProjectFilter]


class InferenceChainView(viewsets.ModelViewSet):
    queryset = InferenceChain.objects.all()
    serializer_class = InferenceChainSerializer
    filter_backends = [ProjectFilter, InferenceFilter]
