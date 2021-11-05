#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import (
    filters
)

from pkpdapp.models import (
    Dataset, Project,
    PharmacodynamicModel,
    DosedPharmacokineticModel,
    Protocol,
    Unit,
    PkpdModel,
    BiomarkerType,
    Variable,
    Subject,
)


class UserAccessFilter(filters.BaseFilterBackend):
    """
    Filter that allows filtering by user.
    """

    def filter_queryset(self, request, queryset, view):

        if request.user.is_superuser:
            return queryset

        user = request.user
        if queryset.model == Project:
            queryset = queryset.filter(users=user)
        else:
            raise RuntimeError('queryset model {} not recognised')
        return queryset


class DosedPkModelFilter(filters.BaseFilterBackend):
    """
    Filter that only allows users to filter by dosed_pk_model.
    """

    def filter_queryset(self, request, queryset, view):
        dosed_pk_model_id = \
            request.query_params.get('dosed_pk_model_id')
        if dosed_pk_model_id is not None:
            try:
                dosed_pk_model = DosedPharmacokineticModel.objects.get(
                    id=dosed_pk_model_id
                )
                if queryset.model == Variable:
                    queryset = dosed_pk_model.variables.all()
                elif queryset.model == Unit:
                    unit_ids = (
                        dosed_pk_model.variables
                        .values_list('unit', flat=True)
                    )
                    queryset = Unit.objects.filter(id__in=unit_ids)
                else:
                    raise RuntimeError('queryset model {} not recognised')
            except DosedPharmacokineticModel.DoesNotExist:
                queryset = queryset.model.objects.none()

        return queryset


class PdModelFilter(filters.BaseFilterBackend):
    """
    Filter that only allows users to filter by dosed_pk_model.
    """

    def filter_queryset(self, request, queryset, view):
        pd_model_id = \
            request.query_params.get('pd_model_id')
        if pd_model_id is not None:
            try:
                pd_model = PharmacodynamicModel.objects.get(
                    id=pd_model_id
                )
                if queryset.model == Variable:
                    queryset = pd_model.variables.all()
                elif queryset.model == Unit:
                    unit_ids = (
                        pd_model.variables
                        .values_list('unit', flat=True)
                    )
                    queryset = Unit.objects.filter(id__in=unit_ids)
                else:
                    raise RuntimeError('queryset model {} not recognised')
            except PharmacodynamicModel.DoesNotExist:
                queryset = queryset.model.objects.none()

        return queryset


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
                elif queryset.model == Protocol:
                    queryset = project.protocols
                elif queryset.model == BiomarkerType:
                    queryset = BiomarkerType.objects.filter(
                        dataset__project=project
                    )
                elif queryset.model == Subject:
                    queryset = Subject.objects.filter(
                        dataset__project=project
                    )
                elif queryset.model == Variable:
                    queryset = queryset.filter(
                        Q(pd_model__project=project) |
                        Q(dosed_pk_model__project=project)
                    )
                else:
                    raise RuntimeError('queryset model {} not recognised')
            except Project.DoesNotExist:
                queryset = queryset.model.objects.none()

        return queryset
