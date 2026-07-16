#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from dataclasses import asdict

from django.core.exceptions import ObjectDoesNotExist
from rest_framework import views, status
from rest_framework.response import Response
from rest_framework import serializers
from drf_spectacular.utils import extend_schema
from pkpdapp.api.views.profiling import profile_endpoint
from pkpdapp.models import CombinedModel, ObservationInfo, ParameterInfo
from pkpdapp.models.optimise_context import load_project_biomarker_types
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
    # One noise model per fitted output variable, in the same canonical order as
    # the sigma arrays (ascending variable id). Missing entries default to
    # "additive". The *_mult sigma fields are only consumed for outputs whose
    # model is "combined".
    noise_models = serializers.ListField(
        child=serializers.ChoiceField(
            choices=["additive", "multiplicative", "combined"],
        ),
        required=False,
        allow_null=True,
    )
    method = serializers.CharField(required=False, default="pso")
    # sigma_start and sigma_bounds carry one *linear* sigma entry per fitted
    # output variable, in the canonical order the backend derives from
    # biomarker_types (ascending variable id). The corresponding variable ids are
    # echoed back as sigma_variables in the response. sigma_use_log_space selects
    # whether each sigma is optimised in log space. The *_mult fields are the
    # second (proportional) sigma, used only by outputs with the "combined" model.
    sigma_start = serializers.ListField(
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
    sigma_use_log_space = serializers.ListField(
        child=serializers.BooleanField(), required=False, allow_null=True
    )
    sigma_mult_start = serializers.ListField(
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
    sigma_mult_use_log_space = serializers.ListField(
        child=serializers.BooleanField(), required=False, allow_null=True
    )
    # One flag per model parameter, parallel to ``inputs``: optimise that
    # parameter in log space. Only valid where the parameter's lower bound is
    # >= 0 (the backend raises otherwise).
    use_log_space = serializers.ListField(
        child=serializers.BooleanField(), required=False, allow_null=True
    )


class OptimiseResponseSerializer(serializers.Serializer):
    optimal = serializers.ListField(child=serializers.FloatField())
    loss = serializers.FloatField()
    reason = serializers.CharField()
    sigma = serializers.ListField(child=serializers.FloatField())
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
    # One noise model per fitted output variable, aligned to sigma_variables.
    # Always present (the view builds a concrete list, possibly empty).
    noise_models = serializers.ListField(child=serializers.CharField())
    method = serializers.CharField()
    predictions = serializers.ListField(child=serializers.DictField(), allow_null=True)
    residuals = serializers.ListField(child=serializers.DictField(), allow_null=True)
    observations = serializers.ListField(
        child=serializers.DictField(), allow_null=True
    )
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
    sigma_start = serializers.ListField(
        child=serializers.FloatField(), allow_null=True
    )
    sigma_bounds = serializers.ListField(
        child=serializers.ListField(child=serializers.FloatField()),
        allow_null=True,
    )
    sigma_use_log_space = serializers.ListField(
        child=serializers.BooleanField(), allow_null=True
    )
    sigma_mult_start = serializers.ListField(
        child=serializers.FloatField(), allow_null=True
    )
    sigma_bounds_mult = serializers.ListField(
        child=serializers.ListField(child=serializers.FloatField()),
        allow_null=True,
    )
    sigma_mult_use_log_space = serializers.ListField(
        child=serializers.BooleanField(), allow_null=True
    )


class ErrorResponseSerializer(serializers.Serializer):
    error = serializers.CharField()


def _build_model_parameters(data):
    """Convert the request's parallel model-parameter arrays into a ParameterInfo
    list.

    The wire format stays as parallel lists (inputs / starting / bounds /
    use_log_space); the conversion to the ParameterInfo list ``optimise`` expects
    happens here. ``use_log_space`` defaults to False per parameter when absent.
    """
    use_log_space = data.get("use_log_space") or []
    return [
        ParameterInfo(
            variable_id=variable_id,
            starting=float(starting),
            lower_bound=float(lower),
            upper_bound=float(upper),
            use_log_space=bool(use_log_space[i]) if i < len(use_log_space) else False,
        )
        for i, (variable_id, starting, lower, upper) in enumerate(
            zip(
                data["inputs"],
                data["starting"],
                data["bounds"][0],
                data["bounds"][1],
            )
        )
    ]


def _sigma_parameter(values, bounds, use_log, i):
    """Build one sigma ParameterInfo from the request's parallel sigma arrays.

    The sigma start / bounds are *linear* sigma values, and ``use_log`` selects
    whether it is optimised in log space. Any array the client omitted falls back
    to the per-output defaults (1.0, [0.0, 1.0], log space).
    """
    return ParameterInfo(
        starting=float(values[i]) if values is not None else 1.0,
        lower_bound=float(bounds[i][0]) if bounds is not None else 0.0,
        upper_bound=float(bounds[i][1]) if bounds is not None else 1.0,
        use_log_space=bool(use_log[i]) if use_log is not None else True,
    )


def _build_observations(project, data):
    """Translate the request into the ``observations`` list ``optimise`` expects.

    The wire format keeps per-output parallel arrays in the backend's canonical
    order (fitted output variables ascending by variable id): a ``noise_models``
    array plus the sigma arrays. This resolves the fitted biomarker types (the
    request's ``biomarker_types``, or all mapped types when absent), sorts them
    into that canonical order, and pairs each with its own noise model and sigma
    parameter(s), producing one :class:`ObservationInfo` per output. The second
    (proportional) sigma is only attached to outputs whose model is "combined".

    Returns ``(observations, noise_model_by_variable_id)`` — the map lets the
    caller echo the per-output noise models aligned to the result's
    ``sigma_variables``.
    """
    biomarker_types = load_project_biomarker_types(
        project, data.get("biomarker_types")
    )
    # Canonical order matches the backend's sigma ordering (ascending variable id).
    # Unmapped types have no output variable and are excluded here; the optimise
    # context raises for any explicitly requested type that is unmapped.
    mapped = sorted(
        (bt for bt in biomarker_types if bt.variable_id is not None),
        key=lambda bt: bt.variable_id,
    )

    noise_models = data.get("noise_models")
    sigma_start = data.get("sigma_start")
    sigma_bounds = data.get("sigma_bounds")
    sigma_use_log_space = data.get("sigma_use_log_space")
    sigma_mult_start = data.get("sigma_mult_start")
    sigma_bounds_mult = data.get("sigma_bounds_mult")
    sigma_mult_use_log_space = data.get("sigma_mult_use_log_space")

    # Noise (sigma) parameters are required: reject a request that supplies none
    # of the sigma arrays rather than silently falling back to defaults.
    if all(
        array is None
        for array in (
            sigma_start,
            sigma_bounds,
            sigma_use_log_space,
            sigma_mult_start,
            sigma_bounds_mult,
            sigma_mult_use_log_space,
        )
    ):
        raise ValueError("sigma parameters are required.")

    def noise_model_at(i):
        if noise_models is not None and i < len(noise_models):
            return noise_models[i]
        return "additive"

    observations = []
    noise_model_by_variable_id = {}
    for i, biomarker_type in enumerate(mapped):
        noise_model = noise_model_at(i)
        noise_model_by_variable_id[biomarker_type.variable_id] = noise_model
        sigma_mult = (
            _sigma_parameter(
                sigma_mult_start, sigma_bounds_mult, sigma_mult_use_log_space, i
            )
            if noise_model == "combined"
            else None
        )
        observations.append(
            ObservationInfo(
                biomarker_type=biomarker_type.id,
                noise_model=noise_model,
                sigma=_sigma_parameter(
                    sigma_start, sigma_bounds, sigma_use_log_space, i
                ),
                sigma_mult=sigma_mult,
            )
        )
    return observations, noise_model_by_variable_id


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

            # Group each model parameter's attributes into a ParameterInfo.
            parameters = _build_model_parameters(data)

            # Translate the per-output wire arrays (noise_models + sigma arrays)
            # into the per-observation ``observations`` list optimise expects.
            try:
                observations, noise_model_by_variable_id = _build_observations(
                    m.get_project(), data
                )
                result = m.optimise(
                    parameters=parameters,
                    observations=observations,
                    subject_groups=data.get("subject_groups"),
                    max_iterations=data.get("max_iterations"),
                    method=data.get("method", "pso"),
                )
            except (
                myokit.MyokitError,
                RuntimeError,
                ValueError,
                ObjectDoesNotExist,
            ) as e:
                serialized_result = ErrorResponseSerializer({"error": str(e)})
                return Response(
                    serialized_result.data, status=status.HTTP_400_BAD_REQUEST
                )

            # sigma_variables / sigma_start / sigma_bounds come back from result in
            # the backend's canonical output ordering so all sigma arrays align.
            # Echo noise_models in that same order.
            noise_models = [
                noise_model_by_variable_id.get(variable_id, "additive")
                for variable_id in (result.sigma_variables or [])
            ]
            serialized_result = OptimiseResponseSerializer(
                {
                    **asdict(result),
                    "inputs": data["inputs"],
                    "starting": data["starting"],
                    "bounds": data["bounds"],
                    "biomarker_types": data.get("biomarker_types"),
                    "subject_groups": data.get("subject_groups"),
                    "max_iterations": data.get("max_iterations"),
                    "noise_models": noise_models,
                    "method": data.get("method", "pso"),
                }
            )
            return Response(serialized_result.data)


class OptimiseCombinedView(OptimiseBaseView):
    model = CombinedModel
