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
    Inference, InferenceChain, Algorithm, Dataset,
    DosedPharmacokineticModel, PharmacodynamicModel,
    Variable,
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
        'model': {
            'form': 'PK',
            'id': 5
        }
        'dataset': 3,

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
                'biomarker': 'concentration,
            },
            {
                'model': 'myokit.bacteria_count',
                'biomarker': 'bacteria,
            },
        ]
    }

    Uses model as the base model. If it is a PK or PKPD model, creates a model
    for each protocol used in the dataset, replacing the protocol of the model
    with each new one.

    This set of models has a set of parameters, and parameters of the same
    qname are assumed to be identical. All Variable fields from the original
    model are copied over to the new models. Priors and fixed values for each
    parameter in this set are provided in 'parameters'.

    The 'observations' field maps model output variables with biomarkers in the
    dataset


    """

    def post(self, request, format=None):
        errors = {}
        data = json.loads(request.body)

        if 'dataset' not in data:
            try:
                dataset = Dataset.objects.get(id=data['dataset'])
            except Dataset.DoesNotExist:
                errors['dataset'] = 'id {} not found'.format(data['dataset'])
        else:
            errors['dataset'] = 'field required'

        model_table = None
        model_id = None
        if 'model' in data:
            if 'form' in data['model']:
                if data['model']['form'] == 'PK':
                    model_table = DosedPharmacokineticModel
                else:
                    model_table = PharmacodynamicModel
            else:
                errors.get('model', {})['form'] = 'field required'
            if 'id' in data['model']:
                model_id = data['model']['id']
            else:
                errors.get('model', {})['id'] = 'field required'

        else:
            errors['model'] = 'field required'

        if (
            model_table is not None and
            model_id is not None
        ):
            try:
                model = model_table.objects.get(id=model_id)
            except model_table.DoesNotExist:
                errors['model'] = '{} id {} not found'.format(
                    model_table, model_id
                )

        if 'parameters' in data:
            for param, value in data['parameters'].items():
                if model.variables.filter(qname=param).count() == 0:
                    errors.get('parameters', {})[param] = 'not found in model'
        else:
            errors['parameters'] = 'field required'

        if 'observations' in data:
            for i, obs in enumerate(data['observations']):
                model_var = obs['model']
                biomarker = obs['biomarker']
                if dataset.biomarkers.filter(name=biomarker).count() == 0:
                    errors.get('observations', {}).get(i, {})['biomarker'] = \
                        'not found in dataset'
                if model.variables.filter(qname=model_var).count() == 0:
                    errors.get('observations', {}).get(i, {})['model'] = \
                        'not found in model'
        else:
            errors['observations'] = 'field required'

        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)


        protocols = Protocol.objects.filter(
            projects
            subjects__dataset__in=datset


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
