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
)
from pkpdapp.models import (
    Inference, InferenceChain, Algorithm,
)


class AlgorithmView(viewsets.ModelViewSet):
    queryset = Algorithm.objects.all()
    serializer_class = AlgorithmSerializer


class InferenceView(viewsets.ModelViewSet):
    queryset = Inference.objects.all()
    serializer_class = InferenceSerializer
    filter_backends = [ProjectFilter]


class InferenceOperationView(views.APIView):
    def op(self, inference):
        raise NotImplementedError

    def post(self, request, pk, format=None):
        try:
            inference = Inference.objects.get(pk=pk)
        except Inference.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        errors = {}
        model = inference.get_model()
        if model is None:
            for field in ['pd_model', 'dosed_pd_model', 'pkpd_model']:
                errors[field] = 'Inference must have a model'

        if inference.priors.count() == 0:
            errors['priors'] = 'Inference must have at least one prior'

        if inference.objective_functions.count() == 0:
            errors['objective_functions'] = (
                'Inference must have at least one objective function'
            )

        if errors:
            return Response(
                errors, status=status.HTTP_400_BAD_REQUEST
            )

        stored_inference = self.op(inference)

        return Response(InferenceSerializer(stored_inference).data)


class RunInferenceView(InferenceOperationView):
    def op(self, inference):
        return inference.run_inference()


class StopInferenceView(InferenceOperationView):
    def op(self, inference):
        return inference.stop_inference()


class InferenceChainView(viewsets.ModelViewSet):
    queryset = InferenceChain.objects.all()
    serializer_class = InferenceChainSerializer
    filter_backends = [ProjectFilter, InferenceFilter]
