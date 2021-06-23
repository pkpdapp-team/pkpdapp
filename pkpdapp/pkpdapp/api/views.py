#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import viewsets, filters
from .serializers import (
    DatasetSerializer, UserSerializer, ProjectSerializer,
    PharmacokineticSerializer,
    PharmacodynamicSerializer,
    DoseSerializer,
    DosedPharmacokineticSerializer,
    PkpdSerializer,
    ProtocolSerializer,
)

from pkpdapp.models import (
    Dataset, Project,
    PharmacokineticModel,
    PharmacodynamicModel,
    DosedPharmacokineticModel,
    Protocol,
    Dose,
    PkpdModel,
)
from django.contrib.auth.models import User


class EnablePartialUpdateMixin:
    """Enable partial updates"""

    def update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return super().update(request, *args, **kwargs)


class ProjectFilter(filters.BaseFilterBackend):
    """
    Filter that only allows users to filter by project.
    """

    def filter_queryset(self, request, queryset, view):
        project_id = request.query_params.get('project_id')
        if project_id is not None:
            try:
                project = Project.objects.get(
                    id=project_id
                )
                if queryset.model == Dataset:
                    queryset = project.datasets
                elif queryset.model == PharmacodynamicModel:
                    queryset = project.pd_models
                elif queryset.model == DosedPharmacokineticModel:
                    queryset = project.pk_models
                elif queryset.model == PkpdModel:
                    queryset = project.pkpd_models
                else:
                    raise RuntimeError('queryset model {} not recognised')
            except Project.DoesNotExist:
                queryset = queryset.model.objects.none()

        return queryset


class ProtocolView(viewsets.ModelViewSet):
    queryset = Protocol.objects.all()
    serializer_class = ProtocolSerializer


class DoseView(viewsets.ModelViewSet):
    queryset = Dose.objects.all()
    serializer_class = DoseSerializer


class PharmacokineticView(viewsets.ModelViewSet):
    queryset = PharmacokineticModel.objects.all()
    serializer_class = PharmacokineticSerializer


class DosedPharmacokineticView(viewsets.ModelViewSet):
    queryset = DosedPharmacokineticModel.objects.all()
    serializer_class = DosedPharmacokineticSerializer
    filter_backends = [ProjectFilter]


class PharmacodynamicView(viewsets.ModelViewSet):
    queryset = PharmacodynamicModel.objects.all()
    serializer_class = PharmacodynamicSerializer
    filter_backends = [ProjectFilter]


class PkpdView(viewsets.ModelViewSet):
    queryset = PkpdModel.objects.all()
    serializer_class = PkpdSerializer
    filter_backends = [ProjectFilter]


class DatasetView(viewsets.ModelViewSet):
    queryset = Dataset.objects.all()
    serializer_class = DatasetSerializer
    filter_backends = [ProjectFilter]


class ProjectView(EnablePartialUpdateMixin, viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer


class UserView(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
