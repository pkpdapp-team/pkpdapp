#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import viewsets
from pkpdapp.api.views import (
    DosedPkModelFilter,
    PdModelFilter,
)
from pkpdapp.api.serializers import UnitSerializer
from pkpdapp.models import Unit, Compound
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes


class UnitView(viewsets.ModelViewSet):
    queryset = Unit.objects.all()
    serializer_class = UnitSerializer
    filter_backends = [DosedPkModelFilter, PdModelFilter]

    def get_serializer_context(self):
        context = super().get_serializer_context()

        request = self.request
        compound_id = None
        compound = None

        if request is not None:
            compound_id = self.request.query_params.get("compound_id")

        if compound_id is not None:
            try:
                compound = Compound.objects.get(pk=compound_id)
            except Compound.DoesNotExist:
                pass

        if compound is not None:
            context["compound"] = compound

        return context

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="compound_id",
                description="Enable conversions based on compound information",
                required=False,
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
            ),
        ],
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="compound_id",
                description="Enable conversions based on compound information",
                required=False,
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
            ),
        ],
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)
