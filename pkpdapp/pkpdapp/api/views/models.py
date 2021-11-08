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
    PkpdSerializer,
)
from pkpdapp.api.views import (
    ProjectFilter,
    CheckAccessToProject
)
from pkpdapp.models import (
    PharmacokineticModel,
    PharmacodynamicModel,
    DosedPharmacokineticModel,
    PkpdModel
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


class PkpdView(viewsets.ModelViewSet):
    queryset = PkpdModel.objects.all()
    serializer_class = PkpdSerializer
    filter_backends = [ProjectFilter]
