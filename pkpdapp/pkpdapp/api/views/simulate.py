#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import views, status
from rest_framework.response import Response
from rest_framework import serializers
from drf_spectacular.utils import extend_schema
import myokit
from pkpdapp.api.views.profiling import profile_endpoint
from pkpdapp.models import CombinedModel, PharmacodynamicModel, Variable


class SimulateSerializer(serializers.Serializer):
    outputs = serializers.ListField(child=serializers.CharField())
    variables = serializers.DictField(child=serializers.FloatField())
    time_max = serializers.FloatField(required=False)
    use_diffsol = serializers.BooleanField(required=False, default=True)


class SimulateResponseSerializer(serializers.Serializer):
    time = serializers.ListField(child=serializers.FloatField())
    group = serializers.IntegerField(required=False, allow_null=True)
    outputs = serializers.DictField(
        child=serializers.ListField(child=serializers.FloatField())
    )

    def to_representation(self, instance):
        outputs = {}
        times = []
        group = None
        for var_id, values in instance.items():
            if var_id == "group_id":
                group = values
                continue
            variable = Variable.objects.get(pk=var_id)
            if variable.name == "time" or variable.name == "t":
                times = values
            outputs[var_id] = values
        return {
            "outputs": outputs,
            "time": times,
            "group": group,
        }


class ErrorResponseSerializer(serializers.Serializer):
    error = serializers.CharField()


class UncertaintySummarySerializer(serializers.Serializer):
    mean = serializers.ListField(child=serializers.FloatField())
    std = serializers.ListField(child=serializers.FloatField())
    quantiles = serializers.DictField(
        child=serializers.ListField(child=serializers.FloatField())
    )


class SimulateUncertaintySerializer(serializers.Serializer):
    outputs = serializers.ListField(child=serializers.CharField())
    variables = serializers.DictField(child=serializers.FloatField(), required=False)
    variable_distributions = serializers.DictField(
        child=serializers.DictField(),
        required=False,
    )
    time_max = serializers.FloatField(required=False)
    sample_count = serializers.IntegerField(required=False, min_value=1)
    seed = serializers.IntegerField(required=False)
    use_diffsol = serializers.BooleanField(required=False, default=True)
    quantiles = serializers.ListField(
        child=serializers.FloatField(min_value=0.0, max_value=1.0),
        required=False,
    )


class SimulateUncertaintyResponseSerializer(serializers.Serializer):
    time = serializers.ListField(child=serializers.FloatField())
    group = serializers.IntegerField(
        source="group_id", required=False, allow_null=True
    )
    sample_count = serializers.IntegerField()
    outputs = serializers.DictField(child=UncertaintySummarySerializer())


@extend_schema(
    request=SimulateSerializer,
    responses={
        200: SimulateResponseSerializer(many=True),
        400: ErrorResponseSerializer,
        404: None,
    },
)
class SimulateBaseView(views.APIView):
    def post(self, request, pk, format=None):
        with profile_endpoint(
            "simulate",
            view=self.__class__.__name__,
            model=self.model.__name__,
            pk=pk,
        ):
            try:
                m = self.model.objects.get(pk=pk)
            except self.model.DoesNotExist:
                return Response(status=status.HTTP_404_NOT_FOUND)

            serializer = SimulateSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(
                    {"error": str(serializer.errors)},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            data = serializer.validated_data
            try:
                result = m.simulate(
                    data["outputs"],
                    data["variables"],
                    data.get("time_max"),
                    use_diffsol=data.get("use_diffsol", True),
                )
            except (myokit.MyokitError, RuntimeError, ValueError) as e:
                serialized_result = ErrorResponseSerializer({"error": str(e)})
                return Response(
                    serialized_result.data, status=status.HTTP_400_BAD_REQUEST
                )
            serialized_result = SimulateResponseSerializer(result, many=True)
            return Response(serialized_result.data)


class SimulateCombinedView(SimulateBaseView):
    model = CombinedModel


class SimulatePdView(SimulateBaseView):
    model = PharmacodynamicModel


@extend_schema(
    request=SimulateUncertaintySerializer,
    responses={
        200: SimulateUncertaintyResponseSerializer(many=True),
        400: ErrorResponseSerializer,
        404: None,
    },
)
class SimulateUncertaintyBaseView(views.APIView):
    def post(self, request, pk, format=None):
        try:
            m = self.model.objects.get(pk=pk)
        except self.model.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = SimulateUncertaintySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"error": str(serializer.errors)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data

        try:
            result = m.simulate_uncertainty(
                outputs=data["outputs"],
                variables=data.get("variables"),
                time_max=data.get("time_max"),
                variable_distributions=data.get("variable_distributions"),
                sample_count=data.get("sample_count", 200),
                seed=data.get("seed"),
                use_diffsol=data.get("use_diffsol", True),
                quantiles=data.get("quantiles"),
            )
        except (
            myokit.MyokitError,
            ValueError,
            TypeError,
            KeyError,
            AttributeError,
            Variable.DoesNotExist,
        ) as e:
            serialized_result = ErrorResponseSerializer({"error": str(e)})
            return Response(
                serialized_result.data,
                status=status.HTTP_400_BAD_REQUEST,
            )

        serialized_result = SimulateUncertaintyResponseSerializer(result, many=True)
        return Response(serialized_result.data)


class SimulateUncertaintyCombinedView(SimulateUncertaintyBaseView):
    model = CombinedModel


class SimulateUncertaintyPdView(SimulateUncertaintyBaseView):
    model = PharmacodynamicModel
