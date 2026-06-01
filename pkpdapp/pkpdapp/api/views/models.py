#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import viewsets, response, parsers, status, decorators
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from rest_framework.permissions import IsAuthenticated
from django.db import IntegrityError, transaction

from pkpdapp.api.serializers import (
    PharmacokineticSerializer,
    PharmacodynamicSerializer,
    CombinedModelSerializer,
    PharmacodynamicSbmlSerializer,
)
from pkpdapp.api.views import ProjectFilter, CheckAccessToProject
from pkpdapp.models import (
    PharmacokineticModel,
    PharmacodynamicModel,
    CombinedModel,
    Inference,
)


class PharmacokineticView(viewsets.ModelViewSet):
    queryset = PharmacokineticModel.objects.all()
    serializer_class = PharmacokineticSerializer
    permission_classes = [IsAuthenticated & CheckAccessToProject]


class CombinedModelView(viewsets.ModelViewSet):
    queryset = CombinedModel.objects.all()
    serializer_class = CombinedModelSerializer
    filter_backends = [ProjectFilter]
    permission_classes = [IsAuthenticated & CheckAccessToProject]

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="project_id",
                description="Filter results by project ID",
                required=False,
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
            ),
        ],
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @transaction.atomic
    def perform_update(self, serializer):
        delete_protocols = self.request.query_params.get('delete_protocols', None)
        # Set flag on instance before first save attempt
        instance = self.get_object()
        if (delete_protocols is not None) and delete_protocols.lower() == 'true':
            instance._delete_protocols = True
        try:
            serializer.save()
        except IntegrityError as e:
            if (delete_protocols is not None) and delete_protocols.lower() == 'true':
                # After rollback, identify which variables will be deleted
                # and only delete protocols for those variables

                # Re-fetch instance after rollback
                instance.refresh_from_db()

                # Get the myokit model to determine which variables should exist
                model = instance.get_myokit_model()
                removed_variables = instance.calculate_removed_variables()
                # Get qnames that should exist in the new model
                new_qnames = set()
                for v in model.variables(const=True, sort=True):
                    if v.is_literal() and v.qname() not in removed_variables:
                        new_qnames.add(v.qname())
                for v in model.variables(state=True, sort=True):
                    if v.qname() not in removed_variables:
                        new_qnames.add(v.qname())
                for v in model.variables(const=False, state=False, sort=True):
                    if v.qname() not in removed_variables:
                        new_qnames.add(v.qname())

                # Find existing variables that won't be in the new model
                for variable in instance.variables.all():
                    if variable.qname not in new_qnames:
                        # Delete protocols only for this variable
                        variable.protocols.all().delete()

                serializer.save()
            else:
                raise e

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="delete_protocols",
                description="Delete linked protocols and dosing variables.",
                required=False,
                type=OpenApiTypes.BOOL,
                location=OpenApiParameter.QUERY,
            ),
        ],
    )
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            self.perform_update(serializer)
            return response.Response(serializer.data)
        except IntegrityError as e:
            return response.Response(
                {"error": str(e)}, status=status.HTTP_400_BAD_REQUEST
            )

    @decorators.action(
        detail=True,
        methods=["PUT"],
        serializer_class=CombinedModelSerializer,
    )
    def set_variables_from_inference(self, request, pk):
        obj = self.get_object()
        try:
            inference = Inference.objects.get(id=request.data["inference_id"])
        except Inference.DoesNotExist:
            return response.Response(
                {"inference_id": "inference not found"}, status.HTTP_400_BAD_REQUEST
            )

        obj.set_variables_from_inference(inference)
        serializer = self.serializer_class(obj)
        return response.Response(serializer.data)

    @decorators.action(
        detail=True,
        methods=["PUT"],
        serializer_class=CombinedModelSerializer,
    )
    def set_params_to_defaults(self, request, pk):
        obj = self.get_object()
        project = obj.get_project()
        if project is None:
            return response.Response(
                {"project": "project not found"}, status.HTTP_400_BAD_REQUEST
            )
        compound = project.compound
        if compound is None:
            return response.Response(
                {"compound": "compound not found"}, status.HTTP_400_BAD_REQUEST
            )
        print("setting params to defaults", project.species, compound.compound_type)
        obj.reset_params_to_defaults(project.species, compound.compound_type)
        serializer = self.serializer_class(obj)
        return response.Response(serializer.data)


class PharmacodynamicView(viewsets.ModelViewSet):
    queryset = PharmacodynamicModel.objects.all()
    serializer_class = PharmacodynamicSerializer
    filter_backends = [ProjectFilter]
    permission_classes = [IsAuthenticated & CheckAccessToProject]

    @decorators.action(
        detail=True,
        methods=["PUT"],
        serializer_class=PharmacodynamicSbmlSerializer,
        parser_classes=[parsers.MultiPartParser],
    )
    def sbml(self, request, pk):
        obj = self.get_object()
        serializer = self.serializer_class(obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return response.Response(serializer.data)
        print("xXXXXXx", serializer.errors)
        return response.Response(serializer.errors, status.HTTP_400_BAD_REQUEST)

    @decorators.action(
        detail=True,
        methods=["PUT"],
        serializer_class=PharmacodynamicSerializer,
        parser_classes=[parsers.MultiPartParser],
    )
    def mmt(self, request, pk):
        obj = self.get_object()
        serializer = self.serializer_class(obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return response.Response(serializer.data)
        return response.Response(serializer.errors, status.HTTP_400_BAD_REQUEST)

    @decorators.action(
        detail=True,
        methods=["PUT"],
        serializer_class=PharmacodynamicSerializer,
    )
    def set_variables_from_inference(self, request, pk):
        obj = self.get_object()
        try:
            print("got request", request.data)
            inference = Inference.objects.get(id=request.data["inference_id"])
        except Inference.DoesNotExist:
            return response.Response(
                {"inference_id": "inference not found"}, status.HTTP_400_BAD_REQUEST
            )

        obj.set_variables_from_inference(inference)
        serializer = self.serializer_class(obj)
        return response.Response(serializer.data)
