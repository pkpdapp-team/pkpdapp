#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import (
    viewsets, response, parsers, status, decorators
)
from rest_framework.permissions import IsAuthenticated

from pkpdapp.api.serializers import (
    PharmacokineticSerializer,
    PharmacodynamicSerializer,
    DosedPharmacokineticSerializer,
    PharmacodynamicSbmlSerializer,
)
from pkpdapp.api.views import (
    ProjectFilter,
    CheckAccessToProject
)
from pkpdapp.models import (
    PharmacokineticModel,
    PharmacodynamicModel,
    DosedPharmacokineticModel,
    Inference,
)


class PharmacokineticView(viewsets.ModelViewSet):
    queryset = PharmacokineticModel.objects.all()
    serializer_class = PharmacokineticSerializer
    permission_classes = [
        IsAuthenticated & CheckAccessToProject
    ]


class DosedPharmacokineticView(viewsets.ModelViewSet):
    queryset = DosedPharmacokineticModel.objects.all()
    serializer_class = DosedPharmacokineticSerializer
    filter_backends = [ProjectFilter]
    permission_classes = [
        IsAuthenticated & CheckAccessToProject
    ]

    @decorators.action(
        detail=True,
        methods=['PUT'],
        serializer_class=DosedPharmacokineticSerializer,
    )
    def set_variables_from_inference(self, request, pk):
        obj = self.get_object()
        try:
            inference = Inference.objects.get(id=request.data['inference_id'])
        except Inference.DoesNotExist:
            return response.Response({'inference_id': 'inference not found'},
                                     status.HTTP_400_BAD_REQUEST)

        obj.set_variables_from_inference(inference)
        serializer = self.serializer_class(obj)
        return response.Response(serializer.data)


class PharmacodynamicView(viewsets.ModelViewSet):
    queryset = PharmacodynamicModel.objects.all()
    serializer_class = PharmacodynamicSerializer
    filter_backends = [ProjectFilter]
    permission_classes = [
        IsAuthenticated & CheckAccessToProject
    ]

    @decorators.action(
        detail=True,
        methods=['PUT'],
        serializer_class=PharmacodynamicSbmlSerializer,
        parser_classes=[parsers.MultiPartParser],
    )
    def sbml(self, request, pk):
        obj = self.get_object()
        serializer = self.serializer_class(obj, data=request.data,
                                           partial=True)
        if serializer.is_valid():
            serializer.save()
            return response.Response(serializer.data)
        return response.Response(serializer.errors,
                                 status.HTTP_400_BAD_REQUEST)

    @decorators.action(
        detail=True,
        methods=['PUT'],
        serializer_class=PharmacodynamicSerializer,
        parser_classes=[parsers.MultiPartParser],
    )
    def mmt(self, request, pk):
        obj = self.get_object()
        serializer = self.serializer_class(obj, data=request.data,
                                           partial=True)
        if serializer.is_valid():
            serializer.save()
            return response.Response(serializer.data)
        return response.Response(serializer.errors,
                                 status.HTTP_400_BAD_REQUEST)

    @decorators.action(
        detail=True,
        methods=['PUT'],
        serializer_class=PharmacodynamicSerializer,
    )
    def set_variables_from_inference(self, request, pk):
        obj = self.get_object()
        try:
            print('got request', request.data)
            inference = Inference.objects.get(id=request.data['inference_id'])
        except Inference.DoesNotExist:
            return response.Response({'inference_id': 'inference not found'},
                                     status.HTTP_400_BAD_REQUEST)

        obj.set_variables_from_inference(inference)
        serializer = self.serializer_class(obj)
        return response.Response(serializer.data)
