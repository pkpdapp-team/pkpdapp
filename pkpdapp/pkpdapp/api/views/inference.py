#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import viewsets, views
from pkpdapp.api.views import (
    ProjectFilter, InferenceFilter
)
from pkpdapp.api.serializers import (
    InferenceSerializer,
    DraftInferenceSerializer,
    InferenceChainSerializer,
    AlgorithmSerializer,
)
from pkpdapp.models import (
    Inference, InferenceChain, Algorithm, DraftInference,
    StoredDosedPharmacokineticModel,
    StoredPharmacodynamicModel,
    StoredPkpdModel,
)


class AlgorithmView(viewsets.ModelViewSet):
    queryset = Algorithm.objects.all()
    serializer_class = AlgorithmSerializer


class InferenceView(viewsets.ModelViewSet):
    queryset = Inference.objects.all()
    serializer_class = InferenceSerializer
    filter_backends = [ProjectFilter]


class DraftInferenceView(viewsets.ModelViewSet):
    queryset = DraftInference.objects.all()
    serializer_class = DraftInferenceSerializer
    filter_backends = [ProjectFilter]


class RunInferenceView(views.APIView):

    def post(self, request, pk, format=None):
        try:
            draft_inference = DraftInference.objects.get(pk=pk)
        except DraftInference.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        model = inference.get_model()
        inference = Inference.objects.create(draft_inference)

        if isinstance(model, PharmacodynamicModel):
            inference.pd_model = StoredPharmacodynamicModel.objects.create(model)
        elif isinstance(model, DosedPharmacodynamicModel):
            inference.dosed_pk_model = StoredDosedPharmacokineticModel.objects.create(model)
        elif isinstance(model, PkpdModel):
            inference.pkpd_model = StoredPkpdModel.objects.create(model)

        return Response(InferenceSerializer(inference))



class InferenceChainView(viewsets.ModelViewSet):
    queryset = InferenceChain.objects.all()
    serializer_class = InferenceChainSerializer
    filter_backends = [ProjectFilter, InferenceFilter]
