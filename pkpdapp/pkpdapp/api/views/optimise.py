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
from pkpdapp.models import CombinedModel, ParameterInfo
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
    noise_model = serializers.ChoiceField(
        choices=["additive", "multiplicative", "combined"],
        required=False,
        default="additive",
    )
    method = serializers.CharField(required=False, default="pso")
    # log_sigma and sigma_bounds carry one entry per fitted output variable, in
    # the canonical order the backend derives from biomarker_types (ascending
    # variable id). The corresponding variable ids are echoed back as
    # sigma_variables in the response. log_sigma_mult / sigma_bounds_mult are the
    # second (proportional) sigma, used only by the "combined" noise model.
    log_sigma = serializers.ListField(
        child=serializers.FloatField(), required=False, allow_null=True
    )
    sigma_bounds = serializers.ListField(
        child=serializers.ListField(
            child=serializers.FloatField(),
            min_length=2,
            max_length=2,
        ),
        required=False,
        allow_null=True,
    )
    log_sigma_mult = serializers.ListField(
        child=serializers.FloatField(), required=False, allow_null=True
    )
    sigma_bounds_mult = serializers.ListField(
        child=serializers.ListField(
            child=serializers.FloatField(),
            min_length=2,
            max_length=2,
        ),
        required=False,
        allow_null=True,
    )


class OptimiseResponseSerializer(serializers.Serializer):
    optimal = serializers.ListField(child=serializers.FloatField())
    loss = serializers.FloatField()
    reason = serializers.CharField()
    sigma = serializers.ListField(child=serializers.FloatField(), allow_null=True)
    sigma_mult = serializers.ListField(
        child=serializers.FloatField(), allow_null=True
    )
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
    noise_model = serializers.CharField()
    method = serializers.CharField()
    predictions = serializers.ListField(child=serializers.DictField(), allow_null=True)
    residuals = serializers.ListField(child=serializers.DictField(), allow_null=True)
    covariance = serializers.ListField(
        child=serializers.ListField(child=serializers.FloatField()),
        allow_null=True,
    )
    condition_number = serializers.FloatField(allow_null=True)
    neg2ll = serializers.FloatField(allow_null=True)
    aic = serializers.FloatField(allow_null=True)
    bic = serializers.FloatField(allow_null=True)
    filtered_observations = serializers.IntegerField(required=False, allow_null=True)
    sigma_variables = serializers.ListField(
        child=serializers.IntegerField(), allow_null=True
    )
    log_sigma = serializers.ListField(child=serializers.FloatField(), allow_null=True)
    sigma_bounds = serializers.ListField(
        child=serializers.ListField(child=serializers.FloatField()),
        allow_null=True,
    )
    log_sigma_mult = serializers.ListField(
        child=serializers.FloatField(), allow_null=True
    )
    sigma_bounds_mult = serializers.ListField(
        child=serializers.ListField(child=serializers.FloatField()),
        allow_null=True,
    )


class ErrorResponseSerializer(serializers.Serializer):
    error = serializers.CharField()


def _build_model_parameters(data):
    """Convert the request's parallel model-parameter arrays into a ParameterInfo
    list.

    The wire format stays as parallel lists (inputs / starting / bounds); the
    conversion to the ParameterInfo list ``optimise`` expects happens here.
    """
    return [
        ParameterInfo(
            variable_id=variable_id,
            starting=float(starting),
            lower_bound=float(lower),
            upper_bound=float(upper),
        )
        for variable_id, starting, lower, upper in zip(
            data["inputs"],
            data["starting"],
            data["bounds"][0],
            data["bounds"][1],
        )
    ]


def _build_noise_parameters(data, noise_model):
    """Convert the request's parallel sigma arrays into a ParameterInfo list.

    Returns ``None`` when the client supplied no sigma information, so that
    ``optimise`` falls back to its own per-output defaults. Otherwise returns the
    additive sigma_a block followed (for the combined model) by the proportional
    sigma_m block, matching the ordering ``optimise`` expects.
    """
    log_sigma = data.get("log_sigma")
    sigma_bounds = data.get("sigma_bounds")
    log_sigma_mult = data.get("log_sigma_mult")
    sigma_bounds_mult = data.get("sigma_bounds_mult")

    supplied = [log_sigma, sigma_bounds, log_sigma_mult, sigma_bounds_mult]
    present = [array for array in supplied if array is not None]
    if not present:
        return None

    # All sigma arrays carry one entry per fitted output variable, so the output
    # count can be read off whichever array the client provided.
    n_outputs = len(present[0])

    def _block(values, bounds):
        return [
            ParameterInfo(
                starting=float(values[i]) if values is not None else 0.0,
                lower_bound=float(bounds[i][0]) if bounds is not None else -20.0,
                upper_bound=float(bounds[i][1]) if bounds is not None else 20.0,
            )
            for i in range(n_outputs)
        ]

    noise_parameters = _block(log_sigma, sigma_bounds)
    if noise_model == "combined":
        noise_parameters += _block(log_sigma_mult, sigma_bounds_mult)
    return noise_parameters


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
            noise_model = data.get("noise_model", "additive")

            # Group each model parameter's attributes into a ParameterInfo.
            parameters = _build_model_parameters(data)

            # Build the noise (sigma) ParameterInfo list from whichever sigma
            # arrays the client supplied. They are all length n_outputs in the
            # backend's canonical output ordering, so the count is derived from
            # whichever is present. When the client supplies none, pass None so
            # optimise applies its own per-output defaults (0.0, (-20, 20)).
            noise_parameters = _build_noise_parameters(data, noise_model)

            try:
                result = m.optimise(
                    parameters=parameters,
                    noise_parameters=noise_parameters,
                    biomarker_types=data.get("biomarker_types"),
                    subject_groups=data.get("subject_groups"),
                    max_iterations=data.get("max_iterations"),
                    noise_model=noise_model,
                    method=data.get("method", "pso"),
                )
            except (myokit.MyokitError, RuntimeError, ValueError) as e:
                serialized_result = ErrorResponseSerializer({"error": str(e)})
                return Response(
                    serialized_result.data, status=status.HTTP_400_BAD_REQUEST
                )

            # sigma_variables / log_sigma / sigma_bounds come back from result in
            # the backend's canonical output ordering so all sigma arrays align.
            serialized_result = OptimiseResponseSerializer(
                {
                    **result,
                    "inputs": data["inputs"],
                    "starting": data["starting"],
                    "bounds": data["bounds"],
                    "biomarker_types": data.get("biomarker_types"),
                    "subject_groups": data.get("subject_groups"),
                    "max_iterations": data.get("max_iterations"),
                    "noise_model": data.get("noise_model", "additive"),
                    "method": data.get("method", "pso"),
                }
            )
            return Response(serialized_result.data)


class OptimiseCombinedView(OptimiseBaseView):
    model = CombinedModel
