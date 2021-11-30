#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import viewsets, views, status
from rest_framework.response import Response
from pkpdapp.api.views import (
    ProjectFilter, InferenceFilter
)
from pkpdapp.api.serializers import (
    InferenceSerializer,
    InferenceChainSerializer,
    AlgorithmSerializer,
    PriorSerializer,
    ObjectiveFunctionSerializer,
)
from pkpdapp.models import (
    Inference, InferenceChain, Algorithm,
    PharmacodynamicModel, DosedPharmacokineticModel,
    PkpdModel,
)


class AlgorithmView(viewsets.ModelViewSet):
    queryset = Algorithm.objects.all()
    serializer_class = AlgorithmSerializer


class InferenceView(viewsets.ModelViewSet):
    queryset = Inference.objects.all()
    serializer_class = InferenceSerializer
    filter_backends = [ProjectFilter]




class RunInferenceView(views.APIView):

    def post(self, request, pk, format=None):
        try:
            inference = Inference.objects.get(pk=pk)
        except Inference.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        model = inference.get_model()
        if model is None:
            errors = {
                'pd_model': 'Inference must have a model',
                'dosed_pd_model': 'Inference must have a model',
                'pkpd_model': 'Inference must have a model',
            }
            return Response(
                errors, status=status.HTTP_400_BAD_REQUEST
            )

        stored_inference = inference.run_inference()
        return Response(InferenceSerializer(stored_inference).data)


class InferenceChainView(viewsets.ModelViewSet):
    queryset = InferenceChain.objects.all()
    serializer_class = InferenceChainSerializer
    filter_backends = [ProjectFilter, InferenceFilter]
