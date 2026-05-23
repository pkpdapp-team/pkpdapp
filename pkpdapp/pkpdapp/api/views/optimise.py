#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import views, status
from rest_framework.response import Response
from rest_framework import serializers
from drf_spectacular.utils import extend_schema
from pkpdapp.api.views.profiling import profile_endpoint
from pkpdapp.models import CombinedModel
import myokit


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
    use_multiplicative_noise = serializers.BooleanField(required=False, default=True)
    method = serializers.CharField(required=False, default="pso")


class OptimiseResponseSerializer(serializers.Serializer):
    optimal = serializers.ListField(child=serializers.FloatField())
    loss = serializers.FloatField()
    reason = serializers.CharField()
    inputs = serializers.ListField(child=serializers.IntegerField())
    starting = serializers.ListField(child=serializers.FloatField())
    bounds = serializers.ListField(
        child=serializers.ListField(child=serializers.FloatField())
    )
    biomarker_types = serializers.ListField(
        child=serializers.IntegerField(), required=False, allow_null=True
    )
    subject_groups = serializers.ListField(
        child=serializers.IntegerField(), required=False, allow_null=True
    )
    max_iterations = serializers.IntegerField(required=False, allow_null=True)
    use_multiplicative_noise = serializers.BooleanField()
    method = serializers.CharField()
    predictions = serializers.ListField(child=serializers.DictField(), allow_null=True)
    residuals = serializers.ListField(child=serializers.DictField(), allow_null=True)
    covariance = serializers.ListField(
        child=serializers.ListField(child=serializers.FloatField()),
        allow_null=True,
    )
    condition_number = serializers.FloatField(allow_null=True)


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
        with profile_endpoint(
            "optimise",
            view=self.__class__.__name__,
            model=self.model.__name__,
            pk=pk,
        ):
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
                    use_multiplicative_noise=data.get(
                        "use_multiplicative_noise", False
                    ),
                    method=data.get("method", "pso"),
                )
            except (myokit.MyokitError, RuntimeError, ValueError) as e:
                serialized_result = ErrorResponseSerializer({"error": str(e)})
                return Response(
                    serialized_result.data, status=status.HTTP_400_BAD_REQUEST
                )

            serialized_result = OptimiseResponseSerializer(
                {
                    **result,
                    "inputs": data["inputs"],
                    "starting": data["starting"],
                    "bounds": data["bounds"],
                    "biomarker_types": data.get("biomarker_types"),
                    "subject_groups": data.get("subject_groups"),
                    "max_iterations": data.get("max_iterations"),
                    "use_multiplicative_noise": data.get(
                        "use_multiplicative_noise", False
                    ),
                    "method": data.get("method", "pso"),
                }
            )
            return Response(serialized_result.data)


class OptimiseCombinedView(OptimiseBaseView):
    model = CombinedModel
