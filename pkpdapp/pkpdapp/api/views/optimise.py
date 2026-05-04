#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import views, status
from rest_framework.response import Response
from rest_framework import serializers
from drf_spectacular.utils import extend_schema
from pkpdapp.models import CombinedModel


class OptimiseSerializer(serializers.Serializer):
    inputs = serializers.ListField(child=serializers.IntegerField())
    starting = serializers.ListField(child=serializers.FloatField())
    bounds = serializers.ListField(
        child=serializers.ListField(child=serializers.FloatField()),
        min_length=2,
        max_length=2,
    )
    biomarker_types = serializers.ListField(
        child=serializers.IntegerField(), required=False, allow_null=True
    )
    subject_groups = serializers.ListField(
        child=serializers.IntegerField(), required=False, allow_null=True
    )
    max_iterations = serializers.IntegerField(required=False, allow_null=True)
    use_multiplicative_noise = serializers.BooleanField(required=False, default=False)


class OptimiseResponseSerializer(serializers.Serializer):
    optimal = serializers.ListField(child=serializers.FloatField())
    loss = serializers.FloatField()
    reason = serializers.CharField()


class ErrorResponseSerializer(serializers.Serializer):
    error = serializers.CharField()


@extend_schema(
    request=OptimiseSerializer,
    responses={
        200: OptimiseResponseSerializer,
        400: ErrorResponseSerializer,
        404: None,
    },
)
class OptimiseBaseView(views.APIView):
    def post(self, request, pk, format=None):
        try:
            m = self.model.objects.get(pk=pk)
        except self.model.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = OptimiseSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"error": str(serializer.errors)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data
        try:
            result = m.optimise(
                inputs=data["inputs"],
                starting=data["starting"],
                bounds=data["bounds"],
                biomarker_types=data.get("biomarker_types"),
                subject_groups=data.get("subject_groups"),
                max_iterations=data.get("max_iterations"),
                use_multiplicative_noise=data.get("use_multiplicative_noise", False),
            )
        except (RuntimeError, ValueError) as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serialized_result = OptimiseResponseSerializer(result)
        return Response(serialized_result.data)


class OptimiseCombinedView(OptimiseBaseView):
    model = CombinedModel
