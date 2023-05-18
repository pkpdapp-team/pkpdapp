#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import (
    viewsets, response, parsers, status, decorators
)
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from rest_framework.permissions import IsAuthenticated

from pkpdapp.api.serializers import (
    PharmacokineticSerializer,
    PharmacodynamicSerializer,
    CombinedModelSerializer,
    PharmacodynamicSbmlSerializer,
)
from pkpdapp.api.views import (
    ProjectFilter,
    CheckAccessToProject
)
from pkpdapp.models import (
    PharmacokineticModel,
    PharmacodynamicModel,
    CombinedModel,
    Inference,
)


class PharmacokineticView(viewsets.ModelViewSet):
    queryset = PharmacokineticModel.objects.all()
    serializer_class = PharmacokineticSerializer
    permission_classes = [
        IsAuthenticated & CheckAccessToProject
    ]


class CombinedModelView(viewsets.ModelViewSet):
    queryset = CombinedModel.objects.all()
    serializer_class = CombinedModelSerializer
    filter_backends = [ProjectFilter]
    permission_classes = [
        IsAuthenticated & CheckAccessToProject
    ]

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='project_id',
                description='Filter results by project ID',
                required=False,
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY
            ),
        ],
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)


    @decorators.action(
        detail=True,
        methods=['PUT'],
        serializer_class=CombinedModelSerializer,
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
        print('xXXXXXx', serializer.errors)
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
