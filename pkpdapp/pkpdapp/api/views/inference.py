#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import viewsets, views, status
from rest_framework.response import Response
import json
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


class NaivePooledInferenceView(views.APIView):
    """
    expecting data in the form:
    {
        # Inference parameters
        'name': "my inference run",
        'project': 1,
        'algorithm': "XNES",
        'initialization_strategy': 'R',
        'initialization_inference': 2,
        'number_of_chains': 4,
        'max_number_of_iterations': 3000,
        'burn_in': 0,

        # Model
        'model': 5,
        'protocols': [
            3, 4, 5
        ],

        # Model parameters
        'parameters': {
            'myokit.parameter1': {
                'form': 'N',
                'parameters': [0, 1]
            },
            'myokit.parameter2': {
                'form': 'U',
                'parameters': [-1, 1]
            }
            'myokit.parameter3': {
                'form': 'F',
                'parameters': [123.5]
            }
        }

        # output
        'observations': [
            {
                'model': 'myokit.plasma_concentration',
                'biomarker': 3,
                '
            }
            'myokit.bacteria count'
        ]

        # Data parameters
        'dataset': 3,
        'subject_groups': [
            1, 2, 3
        ],


    }

    Uses model as the base model, and then creates a model for each
    protocol listed, replacing the protocol of the model with the new one.

    This set of models has a set of parameters, and parameters of the same
    name are assumed to be identical. All Variable fields from the original
    model are copied over to the new models. Priors and fixed values for each
    parameter in this set is provided in 'parameters'.




    """

    def post(self, request, format=None):
        data = json.loads(request.body)
        try:
            inference = Inference.objects.get(pk=pk)
        except Inference.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        errors = {}
        if inference.log_likelihoods.count() == 0:
            errors['log_likelihoods'] = (
                'Inference must have at least one log_likelihood'
            )
        for log_likelihood in inference.log_likelihoods.all():
            model = log_likelihood.get_model()
            if model is None:
                errors['log_likelihoods'] = 'LogLikelihood must have a model'

            if len(log_likelihood.get_priors()) == 0:
                errors['log_likelihoods'] = (
                    'LogLikelihood must have at least one prior'
                )

        if errors:
            return Response(
                errors, status=status.HTTP_400_BAD_REQUEST
            )

        self.op(inference)

        return Response(InferenceSerializer(inference).data)


class InferenceOperationView(views.APIView):
    def op(self, inference):
        raise NotImplementedError

    def post(self, request, pk, format=None):
        try:
            inference = Inference.objects.get(pk=pk)
        except Inference.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        errors = {}
        if inference.log_likelihoods.count() == 0:
            errors['log_likelihoods'] = (
                'Inference must have at least one log_likelihood'
            )
        for log_likelihood in inference.log_likelihoods.all():
            model = log_likelihood.get_model()
            if model is None:
                errors['log_likelihoods'] = 'LogLikelihood must have a model'

            if len(log_likelihood.get_priors()) == 0:
                errors['log_likelihoods'] = (
                    'LogLikelihood must have at least one prior'
                )

        if errors:
            return Response(
                errors, status=status.HTTP_400_BAD_REQUEST
            )

        self.op(inference)

        return Response(InferenceSerializer(inference).data)


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
