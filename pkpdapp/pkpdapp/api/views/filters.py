#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import filters
from django.db.models import Q
import time

from pkpdapp.models import (
    Dataset,
    Project,
    PharmacodynamicModel,
    CombinedModel,
    Protocol,
    Unit,
    BiomarkerType,
    Variable,
    Subject,
    SubjectGroup,
    Inference,
    InferenceChain,
    LogLikelihood,
    Simulation,
    ResultsTable,
)

queryset_model_not_recognised_text = "queryset model {} not recognised"


class UserAccessFilter(filters.BaseFilterBackend):
    """
    Filter that allows filtering by user.
    """

    def filter_queryset(self, request, queryset, view):
        user = request.user
        if queryset.model == Project:
            queryset = queryset.filter(users=user)
        else:
            raise RuntimeError(queryset_model_not_recognised_text)
        return queryset


class DosedPkModelFilter(filters.BaseFilterBackend):
    """
    Filter that only allows users to filter by dosed_pk_model.
    """

    def filter_queryset(self, request, queryset, view):
        dosed_pk_model_id = request.query_params.get("dosed_pk_model_id")
        if dosed_pk_model_id is not None:
            try:
                dosed_pk_model = CombinedModel.objects.get(id=dosed_pk_model_id)
                if queryset.model == Variable:
                    t0 = time.perf_counter()
                    queryset = dosed_pk_model.variables.all()
                    t1 = time.perf_counter()
                    print("Filtered variables in ", t1 - t0, " seconds")
                elif queryset.model == Unit:
                    unit_ids = dosed_pk_model.variables.values_list("unit", flat=True)
                    queryset = Unit.objects.filter(id__in=unit_ids)
                else:
                    raise RuntimeError(queryset_model_not_recognised_text)
            except CombinedModel.DoesNotExist:
                queryset = queryset.model.objects.none()

        return queryset


class PdModelFilter(filters.BaseFilterBackend):
    """
    Filter that only allows users to filter by dosed_pk_model.
    """

    def filter_queryset(self, request, queryset, view):
        pd_model_id = request.query_params.get("pd_model_id")
        if pd_model_id is not None:
            try:
                pd_model = PharmacodynamicModel.objects.get(id=pd_model_id)
                if queryset.model == Variable:
                    queryset = pd_model.variables.all()
                elif queryset.model == Unit:
                    unit_ids = pd_model.variables.values_list("unit", flat=True)
                    queryset = Unit.objects.filter(id__in=unit_ids)
                else:
                    raise RuntimeError(queryset_model_not_recognised_text)
            except PharmacodynamicModel.DoesNotExist:
                queryset = queryset.model.objects.none()

        return queryset


class InferenceFilter(filters.BaseFilterBackend):
    """
    Filter that only allows users to filter by inference.
    """

    def filter_queryset(self, request, queryset, view):
        inference_id = request.query_params.get("inference_id")
        if inference_id is not None:
            try:
                inference = Inference.objects.get(id=inference_id)
                if queryset.model == Variable:
                    model = inference.get_model()
                    if model:
                        queryset = model.variables.all()
                    else:
                        queryset = queryset.model.objects.none()
                elif queryset.model == InferenceChain:
                    queryset = inference.chains.all()
                elif queryset.model == LogLikelihood:
                    queryset = inference.log_likelihoods.all()
                else:
                    raise RuntimeError(queryset_model_not_recognised_text)
            except Inference.DoesNotExist:
                queryset = queryset.model.objects.none()

        return queryset


class DatasetFilter(filters.BaseFilterBackend):
    """
    Filter that only allows users to filter by dataset.
    """

    def filter_queryset(self, request, queryset, view):
        dataset_id = request.query_params.get("dataset_id")
        if dataset_id is not None:
            try:
                dataset = Dataset.objects.get(id=dataset_id)
                if queryset.model == BiomarkerType:
                    queryset = dataset.biomarker_types.all()
                elif queryset.model == SubjectGroup:
                    queryset = dataset.groups.all()
                elif queryset.model == Subject:
                    queryset = dataset.subjects.all()
                elif queryset.model == Protocol:
                    queryset = dataset.protocols.all()
                elif queryset.model == Variable:
                    queryset = dataset.variables.all()
                else:
                    raise RuntimeError(queryset_model_not_recognised_text)
            except Dataset.DoesNotExist:
                queryset = queryset.model.objects.none()

        return queryset


class ProjectFilter(filters.BaseFilterBackend):
    """
    Filter that only allows users to filter by project.
    """

    def filter_queryset(self, request, queryset, view):
        project_id = request.query_params.get("project_id")
        if project_id is not None:
            try:
                project = Project.objects.get(id=project_id)
                if queryset.model == Dataset:
                    queryset = project.datasets
                elif queryset.model == Simulation:
                    queryset = project.simulations
                elif queryset.model == PharmacodynamicModel:
                    queryset = project.pd_models
                elif queryset.model == CombinedModel:
                    queryset = project.pk_models
                elif queryset.model == Protocol:
                    queryset = project.protocols
                elif queryset.model == Inference:
                    queryset = project.inference_set
                elif queryset.model == InferenceChain:
                    queryset = InferenceChain.objects.filter(
                        inference__in=project.inference_set.all()
                    )
                elif queryset.model == BiomarkerType:
                    queryset = BiomarkerType.objects.filter(dataset__project=project)
                elif queryset.model == Subject:
                    queryset = Subject.objects.filter(dataset__project=project)
                elif queryset.model == SubjectGroup:
                    queryset = project.groups.all()
                elif queryset.model == ResultsTable:
                    queryset = project.results.all()
                elif queryset.model == Variable:
                    queryset = Variable.objects.filter(
                        Q(dosed_pk_model__project=project)
                    )
                else:
                    raise RuntimeError(queryset_model_not_recognised_text)
            except Project.DoesNotExist:
                queryset = queryset.model.objects.none()

        return queryset
