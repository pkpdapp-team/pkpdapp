#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import (
    views, viewsets, filters, status, decorators, response
)
from rest_framework import parsers
from rest_framework.permissions import (
    BasePermission, IsAuthenticated
)
from rest_framework.response import Response
from .serializers import (
    DatasetSerializer, UserSerializer, ProjectSerializer,
    PharmacokineticSerializer,
    PharmacodynamicSerializer,
    PharmacodynamicSbmlSerializer,
    DoseSerializer,
    DosedPharmacokineticSerializer,
    PkpdSerializer,
    ProtocolSerializer,
    UnitSerializer,
    DatasetCsvSerializer,
    BiomarkerTypeSerializer,
    VariableSerializer,
    SubjectSerializer,
    ProjectAccessSerializer,
    NcaSerializer,
)

from pkpdapp.models import (
    Dataset, Project,
    PharmacokineticModel,
    PharmacodynamicModel,
    DosedPharmacokineticModel,
    Protocol,
    Dose,
    Unit,
    PkpdModel,
    BiomarkerType,
    Variable,
    Subject,
    ProjectAccess,
)

from pkpdapp.utils import NCA

from django.contrib.auth.models import User
from django.db.models import Q


class EnablePartialUpdateMixin:
    """Enable partial updates"""

    def update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return super().update(request, *args, **kwargs)


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


class NotADatasetProtocol(BasePermission):
    def has_object_permission(self, request, view, obj):
        is_update_method = \
            request.method == 'PUT' or request.method == 'PATCH'
        if is_update_method and obj.dataset:
            return False
        return True


class CheckAccessToProject(BasePermission):
    def has_permission(self, request, view):
        if request.user.is_superuser:
            return True

        is_create_method = (
            request.method == 'POST'
        )

        if isinstance(request.data, list):
            project_id = request.data[0].get('project', None)
        else:
            project_id = request.data.get('project', None)

        if project_id is None:
            return True

        project = Project.objects.get(id=project_id)

        if project is None:
            return True

        try:
            access = ProjectAccess.objects.get(
                project=project,
                user=request.user,
            )
        except ProjectAccess.DoesNotExist:
            return False

        if is_create_method:
            return not access.read_only

        return True

    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True

        is_update_method = (
            request.method == 'PUT' or
            request.method == 'PATCH'
        )

        project = obj.get_project()

        if project is None:
            return True

        try:
            access = ProjectAccess.objects.get(
                project=project,
                user=request.user,
            )
        except ProjectAccess.DoesNotExist:
            return False

        if is_update_method:
            return not access.read_only

        return True


class NcaView(views.APIView):
    def post(self, request, format=None):
        errors = {
        }
        protocol_id = request.data.get('protocol_id', None)
        if protocol_id is None:
            errors['protocol_id'] = "This field is required"
        else:
            try:
                protocol = Protocol.objects.get(id=protocol_id)
            except Protocol.DoesNotExist:
                errors['protocol_id'] = \
                    "Protocol id {} not found".format(protocol_id)
            if not protocol.subject:
                errors['protocol_id'] = (
                    "Protocol id {} does not have a subject"
                    .format(protocol_id)
                )
            if protocol.dose_type != Protocol.DoseType.DIRECT:
                errors['protocol_id'] = \
                    "Protocol is required to have an IV dose type"

        biomarker_type_id = request.data.get('biomarker_type_id', None)
        if biomarker_type_id is None:
            errors['biomarker_type_id'] = "This field is required"
        else:
            try:
                biomarker_type = \
                    BiomarkerType.objects.get(id=biomarker_type_id)
            except BiomarkerType.DoesNotExist:
                errors['biomarker_type_id'] = (
                    "BiomarkerType id {} not found"
                    .format(biomarker_type_id)
                )

        if errors:
            return Response(
                errors, status=status.HTTP_400_BAD_REQUEST
            )
        df = biomarker_type.as_pandas()
        df = df.loc[df['subjects'] == protocol.subject.id]

        if df.shape[0] == 0:
            errors['biomarker_type'] = (
                "BiomarkerType {} does not have measurements "
                "for subject id {}."
                .format(biomarker_type.id, protocol.subject.id)
            )

        doses = Dose.objects.filter(
            protocol=protocol
        ).all()

        if len(doses) != 1:
            errors['protocol_id'] = (
                "Protocol id {} has {} doses, only a single dose. "
                "Please choose a protocol with only one dose."
                .format(protocol.id, len(doses))
            )

        if errors:
            return Response(
                errors, status=status.HTTP_400_BAD_REQUEST
            )

        times = df['times'].tolist()
        concentrations = df['values'].tolist()
        dose_amount = doses[0].amount

        nca = NCA(times, concentrations, dose_amount)
        nca.calculate_nca()
        serializer = NcaSerializer(nca)
        return Response(serializer.data)


class ProtocolView(viewsets.ModelViewSet):
    queryset = Protocol.objects.all()
    serializer_class = ProtocolSerializer
    filter_backends = [ProjectFilter]
    permission_classes = [IsAuthenticated & NotADatasetProtocol]
    permission_classes = [
        IsAuthenticated & NotADatasetProtocol & CheckAccessToProject
    ]


class UnitView(viewsets.ModelViewSet):
    queryset = Unit.objects.all()
    serializer_class = UnitSerializer
    filter_backends = [DosedPkModelFilter, PdModelFilter]


class NotADatasetDose(BasePermission):
    def has_object_permission(self, request, view, obj):
        is_update_method = request.method == 'PUT' or request.method == 'PATCH'
        if is_update_method and obj.protocol.dataset:
            return False
        return True


class DoseView(viewsets.ModelViewSet):
    queryset = Dose.objects.all()
    serializer_class = DoseSerializer
    permission_classes = [
        IsAuthenticated & NotADatasetDose & CheckAccessToProject
    ]


class PharmacokineticView(viewsets.ModelViewSet):
    queryset = PharmacokineticModel.objects.all()
    serializer_class = PharmacokineticSerializer
    permission_classes = [
        IsAuthenticated & CheckAccessToProject
    ]


class VariableView(viewsets.ModelViewSet):
    queryset = Variable.objects.all()
    serializer_class = VariableSerializer
    filter_backends = [ProjectFilter, DosedPkModelFilter, PdModelFilter]
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


class SimulateBaseView(views.APIView):
    def post(self, request, pk, format=None):
        try:
            m = self.model.objects.get(pk=pk)
        except self.model.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        outputs = request.data.get('outputs', None)
        initial_conditions = request.data.get('initial_conditions', None)
        variables = request.data.get('variables', None)
        result = m.simulate(outputs, initial_conditions, variables)
        return Response(result)


class SimulatePkView(SimulateBaseView):
    model = DosedPharmacokineticModel


class PharmacodynamicView(viewsets.ModelViewSet):
    queryset = PharmacodynamicModel.objects.all()
    serializer_class = PharmacodynamicSerializer
    filter_backends = [ProjectFilter]
    permission_classes = [
        IsAuthenticated & CheckAccessToProject
    ]

    @ decorators.action(
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


class SimulatePdView(SimulateBaseView):
    model = PharmacodynamicModel


class PkpdView(viewsets.ModelViewSet):
    queryset = PkpdModel.objects.all()
    serializer_class = PkpdSerializer
    filter_backends = [ProjectFilter]


class SubjectView(viewsets.ModelViewSet):
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    filter_backends = [ProjectFilter]


class BiomarkerTypeView(viewsets.ModelViewSet):
    queryset = BiomarkerType.objects.all()
    serializer_class = BiomarkerTypeSerializer
    filter_backends = [ProjectFilter]


class DatasetView(viewsets.ModelViewSet):
    queryset = Dataset.objects.all()
    serializer_class = DatasetSerializer
    filter_backends = [ProjectFilter]

    @ decorators.action(
        detail=True,
        serializer_class=DatasetCsvSerializer,
        methods=['PUT'],
        parser_classes=[parsers.MultiPartParser],
    )
    def csv(self, request, pk):
        obj = self.get_object()
        serializer = self.serializer_class(obj, data=request.data,
                                           partial=True)
        if serializer.is_valid():
            serializer.save()
            dataset_serializer = DatasetSerializer(obj)
            return response.Response(dataset_serializer.data)
        return response.Response(serializer.errors,
                                 status.HTTP_400_BAD_REQUEST)


class ProjectAccessView(viewsets.ModelViewSet):
    queryset = ProjectAccess.objects.all()
    serializer_class = ProjectAccessSerializer
    permission_classes = [
        IsAuthenticated & CheckAccessToProject
    ]


class ProjectView(EnablePartialUpdateMixin, viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    filter_backends = [UserAccessFilter]


class UserView(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
