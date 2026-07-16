#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from dataclasses import dataclass
import logging
from typing import Any

import numpy as np
from scipy.linalg import svd
from django.db.models import Max

from pkpdapp.models.simulate_context import (
    OutputContext,
    SimulationGroupContext,
    SimulateContext,
)

logger = logging.getLogger(__name__)

# Lower bound applied to model predictions before taking their logarithm in the
# multiplicative-noise error model.
_MULTIPLICATIVE_NOISE_FLOOR = 1e-5

# Observations at or below this value are dropped from a multiplicative-noise fit,
# because log(observed) is undefined / numerically unstable near zero. The count
# of dropped observations is reported back as ``filtered_observations``.
_MULTIPLICATIVE_OBSERVED_FLOOR = 1e-5

# Supported noise (error) models. See the loss/gradient/diagnostics methods for
# the residual definition of each:
#   - "additive":       y ~ N(y_hat, sigma_a^2)          (one sigma per output)
#   - "multiplicative": log(y) ~ N(log(y_hat), sigma^2)  (log-normal, one sigma)
#   - "combined":       y ~ N(y_hat, sigma_a^2 + sigma_m^2 * y_hat^2)
#                       (two sigmas per output: additive sigma_a and
#                        proportional sigma_m)
NOISE_MODELS = ("additive", "multiplicative", "combined")


@dataclass(frozen=True)
class ParameterInfo:
    """A single parameter to be optimised.

    Used for both model (ODE input) parameters and noise (sigma) parameters.
    Which of the two a ``ParameterInfo`` describes is determined by the list it
    is passed to ``optimise`` in, not by any field on this class.
    """

    starting: float
    lower_bound: float
    upper_bound: float
    # Model params: the variable id being optimised.
    # Noise params: the output variable id this sigma applies to (optional).
    variable_id: int | None = None
    # Optimise this parameter in log space. Only valid when lower_bound >= 0.
    use_log_space: bool = False


@dataclass(frozen=True)
class ObservationInfo:
    """A biomarker type to fit, its noise model, and that model's sigma params.

    ``sigma`` is the additive/log noise standard deviation sigma_a — used by
    every noise model. ``sigma_mult`` is the second, proportional sigma_m; it is
    required for the "combined" model and must be ``None`` otherwise. Each
    ``ObservationInfo`` therefore carries one sigma ``ParameterInfo`` (additive /
    multiplicative) or two (combined), so the noise model and its parameters are
    specified together, per biomarker type.
    """

    biomarker_type: int
    noise_model: str
    sigma: ParameterInfo
    sigma_mult: ParameterInfo | None = None

    def validate(self) -> None:
        """Validate this observation's noise model and sigma parameter(s).

        Raises ``ValueError`` if the noise model is unknown, the required
        ``sigma`` is missing, or the ``sigma_mult`` / combined-model invariant is
        broken (``sigma_mult`` is present iff the model is "combined").
        """
        if self.noise_model not in NOISE_MODELS:
            raise ValueError(
                f"Unknown noise model '{self.noise_model}' for biomarker "
                f"type {self.biomarker_type}. Choose from: {list(NOISE_MODELS)}"
            )
        if self.sigma is None:
            raise ValueError(
                "Each observation must carry a sigma parameter "
                f"(biomarker type {self.biomarker_type})."
            )
        is_combined = self.noise_model == "combined"
        if is_combined and self.sigma_mult is None:
            raise ValueError(
                "The 'combined' noise model requires sigma_mult "
                f"(biomarker type {self.biomarker_type})."
            )
        if not is_combined and self.sigma_mult is not None:
            raise ValueError(
                "sigma_mult is only valid for the 'combined' noise model "
                f"(biomarker type {self.biomarker_type})."
            )


@dataclass(frozen=True)
class OptimiseResult:
    """The result of :meth:`MyokitModelMixin.optimise`.

    All sigma arrays are one entry per fitted output variable, in the canonical
    order given by ``sigma_variables`` (ascending variable id). The ``*_mult``
    fields carry the second (proportional) sigma of the "combined" noise model
    and are ``None`` for the other models. ``predictions`` / ``residuals`` are one
    dict per subject group (keys are ``"group_id"`` and integer variable ids).
    """

    # Optimal ODE input values, in user (linear) space, in the caller's order.
    optimal: list[float]
    loss: float
    reason: str
    # Output variable ids the sigma arrays are aligned to.
    sigma_variables: list[int]
    # Noise starting values / bounds (linear) and whether each was fit in log space.
    sigma_start: list[float]
    sigma_bounds: list[list[float]]
    sigma_use_log_space: list[bool]
    sigma_mult_start: list[float] | None
    sigma_bounds_mult: list[list[float]] | None
    sigma_mult_use_log_space: list[bool] | None
    # Fitted noise standard deviations (linear). The additive ``sigma`` is always
    # populated; ``sigma_mult`` (proportional) exists only for the combined model.
    sigma: list[float]
    sigma_mult: list[float] | None
    # Diagnostics at the optimum.
    predictions: list[dict[str, Any]] | None
    residuals: list[dict[str, Any]] | None
    covariance: list[list[float]] | None
    condition_number: float | None
    filtered_observations: int
    neg2ll: float | None
    aic: float | None
    bic: float | None
    # Observed data points at the fitted time-points, one dict per subject group
    # (same shape as ``predictions`` / ``residuals``). Optional so the result
    # tolerates optimise_diagnostics variants that do or do not report it.
    observations: list[dict[str, Any]] | None = None


@dataclass(frozen=True)
class OptimisationRecordContext:
    output_index: int
    time_index: int
    time: float
    value: float


@dataclass(frozen=True, kw_only=True)
class OptimisationGroupContext(SimulationGroupContext):
    outputs: tuple[OutputContext, ...]
    t_eval: tuple[float, ...]
    records: tuple[OptimisationRecordContext, ...]


def load_project_biomarker_types(project, biomarker_type_ids: list[int] | None):
    """Load the project's biomarker types to fit against.

    When ``biomarker_type_ids`` is ``None`` all biomarker types mapped to a model
    variable are returned; otherwise the named types are loaded (raising
    ``BiomarkerType.DoesNotExist`` for any missing id). The returned list is
    ordered by id and has ``variable`` / ``stored_unit`` / ``stored_time_unit``
    prefetched. Shared by :class:`OptimiseContext` and the optimise API view so
    both resolve the fitted biomarker types the same way.
    """
    from pkpdapp.models import BiomarkerType

    biomarker_type_qs = BiomarkerType.objects.filter(dataset__project=project)
    if biomarker_type_ids is None:
        biomarker_type_qs = biomarker_type_qs.filter(variable__isnull=False)
    else:
        biomarker_type_qs = biomarker_type_qs.filter(id__in=biomarker_type_ids)
        found_ids = set(biomarker_type_qs.values_list("id", flat=True))
        missing_ids = set(biomarker_type_ids) - found_ids
        if missing_ids:
            raise BiomarkerType.DoesNotExist(
                f"Biomarker types do not exist in this project: {missing_ids}"
            )

    return list(
        biomarker_type_qs.select_related(
            "variable",
            "stored_unit",
            "stored_time_unit",
        ).order_by("id")
    )


class OptimiseContext(SimulateContext):
    def __init__(
        self,
        model: Any,
        optimise_inputs: list[int],
        starting: list[float],
        bounds: tuple[list[float], list[float]] | list[list[float]],
        observations: list[ObservationInfo],
        subject_groups: list[int] | None = None,
        outputs: list[str] | None = None,
        variables: dict[str, float] | None = None,
        use_diffsol: bool = False,
        time_max: float | None = None,
    ):
        super().__init__(
            model=model,
            outputs=outputs,
            variables=variables,
            dynamic_inputs=optimise_inputs,
            use_diffsol=use_diffsol,
            build_simulation_groups=False,
            discard_database_state=False,
            time_max=time_max,
        )
        self._validate_optimise_inputs(
            optimise_inputs,
            starting,
            bounds,
        )
        self._validate_observations(observations)
        self.optimise_input_ids = tuple(optimise_inputs)
        self.observations = tuple(observations)
        self._observation_by_biomarker_type = {
            observation.biomarker_type: observation for observation in observations
        }
        self.optimisation_groups = self._build_optimisation_groups(
            [observation.biomarker_type for observation in observations],
            subject_groups,
        )
        self._build_sigma_output_index()

        self._discard_database_state()

    @staticmethod
    def _validate_observations(observations: list[ObservationInfo]) -> None:
        if not observations:
            raise ValueError("Optimisation requires at least one observation.")
        seen: set[int] = set()
        for observation in observations:
            if observation.biomarker_type in seen:
                raise ValueError(
                    "Each biomarker type may appear at most once in observations; "
                    f"biomarker type {observation.biomarker_type} is duplicated."
                )
            seen.add(observation.biomarker_type)
            observation.validate()

    def _build_sigma_output_index(self):
        """
        Build a canonical ordering of the distinct model output variables across
        all optimisation groups. Each distinct output variable gets one noise
        sigma. The ordering (sorted by variable id) is shared by the optimiser
        driver, the loss/gradient/diagnostics, and the API response, so all
        per-output sigma arrays stay aligned.
        """
        outputs_by_id: dict[int, str] = {}
        for group in self.optimisation_groups:
            for output in group.outputs:
                outputs_by_id[output.id] = output.qname

        ordered_ids = sorted(outputs_by_id)
        self.sigma_output_variable_ids = tuple(ordered_ids)
        self.sigma_output_qnames = tuple(outputs_by_id[i] for i in ordered_ids)
        self._sigma_index_by_qname = {
            qname: index for index, qname in enumerate(self.sigma_output_qnames)
        }

        # Each distinct output variable maps to exactly one ObservationInfo (its
        # biomarker type's), giving a per-output noise model and sigma parameter
        # block aligned to the canonical sigma ordering above. ``observation_by_qname``
        # is populated in ``_build_optimisation_groups`` (where the biomarker
        # type -> variable qname mapping is available).
        self.observation_by_output = tuple(
            self._observation_by_qname[qname] for qname in self.sigma_output_qnames
        )
        self.noise_model_by_output = tuple(
            observation.noise_model for observation in self.observation_by_output
        )
        # Output (sigma) indices whose noise model is "combined" carry a second,
        # proportional sigma_m. They occupy the compact sigma_m block that follows
        # the per-output sigma_a block; ``_sigma_m_pos_by_output`` maps an output
        # index to its position within that compact block.
        self.combined_output_indices = tuple(
            index
            for index, noise_model in enumerate(self.noise_model_by_output)
            if noise_model == "combined"
        )
        self._sigma_m_pos_by_output = {
            index: position
            for position, index in enumerate(self.combined_output_indices)
        }

    def _sigma_index_for_record(
        self,
        group: OptimisationGroupContext,
        record: OptimisationRecordContext,
    ) -> int:
        qname = group.outputs[record.output_index].qname
        return self._sigma_index_by_qname[qname]

    def _optimise_predict(
        self,
        group: OptimisationGroupContext,
        values_by_id: dict[int, float],
    ):
        param_ids = tuple(values_by_id.keys())
        values = np.asarray(list(values_by_id.values()), dtype=float)
        if not np.all(np.isfinite(values)):
            raise ValueError("optimisation values must be finite.")

        input_values = np.asarray(
            [input_context.value for input_context in self._simulation_inputs(group)],
            dtype=float,
        )
        for variable_id in param_ids:
            input_values[self._input_index_by_variable_id[variable_id]] = values_by_id[
                variable_id
            ]

        t_eval = np.asarray(group.t_eval, dtype=float)
        diffsol_ode = group.diffsol_ode
        if diffsol_ode is None:
            raise ValueError("Optimisation group is missing a DiffSL ODE.")
        solution = diffsol_ode.solve_dense(input_values, t_eval)
        y = solution.ys

        if y.shape != (len(group.outputs), len(group.t_eval)):
            raise ValueError(
                "Unexpected prediction shape: "
                f"{y.shape}, expected {(len(group.outputs), len(group.t_eval))}."
            )

        return y

    def optimise_predict(
        self,
        group: OptimisationGroupContext,
        values_by_id: dict[int, float],
    ):
        return self._optimise_predict(group, values_by_id)

    def _optimise_predict_with_sens(
        self,
        group: OptimisationGroupContext,
        values_by_id: dict[int, float],
    ):
        """
        Like _optimise_predict but uses solve_fwd_sens to also compute the
        partial derivatives of the outputs w.r.t. the optimised input variables.
        """
        param_ids = tuple(values_by_id.keys())
        values = np.asarray(list(values_by_id.values()), dtype=float)
        if not np.all(np.isfinite(values)):
            raise ValueError("optimisation values must be finite.")

        input_values = np.asarray(
            [input_context.value for input_context in self._simulation_inputs(group)],
            dtype=float,
        )
        for variable_id in param_ids:
            input_values[self._input_index_by_variable_id[variable_id]] = values_by_id[
                variable_id
            ]

        t_eval = np.asarray(group.t_eval, dtype=float)
        diffsol_ode = group.diffsol_ode
        if diffsol_ode is None:
            raise ValueError("Optimisation group is missing a DiffSL ODE.")
        solution = diffsol_ode.solve_fwd_sens(input_values, t_eval)
        y = np.asarray(solution.ys)

        if y.shape != (len(group.outputs), len(group.t_eval)):
            raise ValueError(
                "Unexpected prediction shape: "
                f"{y.shape}, expected {(len(group.outputs), len(group.t_eval))}."
            )

        n_params = len(param_ids)
        n_outputs = len(group.outputs)
        n_times = len(group.t_eval)

        y_prime = np.zeros((n_times, n_outputs, n_params), dtype=float)
        for k, variable_id in enumerate(param_ids):
            param_idx = self._input_index_by_variable_id[variable_id]
            y_prime[:, :, k] = np.asarray(solution.sens[param_idx]).T

        return y.T, y_prime

    def optimise_predict_with_sens(
        self,
        group: OptimisationGroupContext,
        values_by_id: dict[int, float],
    ):
        return self._optimise_predict_with_sens(group, values_by_id)

    def _sigma_array(self, sigma) -> np.ndarray:
        """
        Normalise the (linear) ``sigma`` to a 1-D array with one entry per
        distinct output variable. A scalar is broadcast across all outputs (used
        by tests and as a convenience default).
        """
        n_outputs = len(self.sigma_output_qnames)
        return np.broadcast_to(
            np.asarray(sigma, dtype=float), (n_outputs,)
        ).astype(float, copy=True)

    def _sigma_mult_array(self, sigma_mult) -> np.ndarray:
        """
        Like ``_sigma_array`` for the combined model's second (proportional)
        sigma, defaulting a missing value to 1.0.
        """
        return self._sigma_array(1.0 if sigma_mult is None else sigma_mult)

    @staticmethod
    def _is_filtered_observation(observed) -> bool:
        """Whether an observation is dropped from a multiplicative-noise fit.

        Multiplicative noise takes ``log(observed)``, which is undefined /
        unstable at or near zero, so such observations are filtered out rather
        than aborting the whole fit. Only meaningful for the multiplicative
        model; other noise models never filter.
        """
        return observed <= _MULTIPLICATIVE_OBSERVED_FLOOR

    @staticmethod
    def _combined_variance(sigma_a2_k, sigma_m2_k, prediction):
        """Per-observation variance of the combined noise model:
        s^2 = sigma_a^2 + sigma_m^2 * prediction^2."""
        return sigma_a2_k + sigma_m2_k * prediction * prediction

    @staticmethod
    def _gaussian_nll_term(variance, residual):
        """Per-observation Gaussian negative log-likelihood contribution
        (dropping the constant 0.5*log(2*pi)). Used by every noise model: the
        additive / multiplicative models pass ``variance = sigma_a^2`` and the
        combined model passes ``variance = sigma_a^2 + sigma_m^2 * prediction^2``.
        """
        return 0.5 * np.log(variance) + residual * residual / (2.0 * variance)

    def _optimise_loss(
        self,
        groups: tuple[OptimisationGroupContext, ...],
        values_by_id: dict[int, float],
        sigma: float = 1.0,
        sigma_mult=None,
    ):
        """
        Negative log-likelihood across ``groups``, summed point-by-point with
        each observation contributing according to the noise model of its output
        variable (``self.noise_model_by_output``).

        Every model uses the same Gaussian term ``0.5*log(s2) + r^2/(2*s2)``; the
        models differ only in the residual ``r`` and the variance ``s2``:
          - additive:       r = prediction - observed, s2 = sigma_a^2
          - multiplicative: r = log(prediction) - log(observed), s2 = sigma_a^2
                            (observations at/near zero are filtered out)
          - combined:       r = prediction - observed,
                            s2 = sigma_a^2 + sigma_m^2 * prediction^2
        """
        values = np.asarray(list(values_by_id.values()), dtype=float)
        if not np.all(np.isfinite(values)):
            return np.inf

        sigma2 = self._sigma_array(sigma) ** 2
        sigma_m2 = self._sigma_mult_array(sigma_mult) ** 2
        noise_models = self.noise_model_by_output

        nll = 0.0
        for group in groups:
            try:
                y = self._optimise_predict(group, values_by_id)
            except Exception:
                logger.exception("diffsol solve failed during optimisation.")
                return np.inf

            for record in group.records:
                k = self._sigma_index_for_record(group, record)
                noise_model = noise_models[k]
                prediction = y[record.output_index, record.time_index]
                observed = record.value
                if noise_model == "combined":
                    residual = prediction - observed
                    s2 = self._combined_variance(sigma2[k], sigma_m2[k], prediction)
                elif noise_model == "multiplicative":
                    if self._is_filtered_observation(observed):
                        continue
                    prediction = max(prediction, _MULTIPLICATIVE_NOISE_FLOOR)
                    residual = np.log(prediction) - np.log(observed)
                    s2 = sigma2[k]
                else:
                    residual = prediction - observed
                    s2 = sigma2[k]
                nll += self._gaussian_nll_term(s2, residual)

        if not np.isfinite(nll):
            return np.inf
        return float(nll)

    def optimise_loss(
        self,
        groups: tuple[OptimisationGroupContext, ...],
        values_by_id: dict[int, float],
        sigma: float = 1.0,
        sigma_mult=None,
    ):
        return self._optimise_loss(groups, values_by_id, sigma, sigma_mult)

    def _optimise_loss_gradient(
        self,
        groups: tuple[OptimisationGroupContext, ...],
        values_by_id: dict[int, float],
        sigma: float = 1.0,
        sigma_mult=None,
    ):
        """
        Returns (nll, ode_gradient, sigma_gradient) across prepared groups,
        using forward sensitivities for the requested input variables, with each
        observation contributing point-by-point according to its output's noise
        model.

        ``ode_gradient`` is the gradient of the negative log-likelihood w.r.t.
        the optimised ODE input variables. ``sigma_gradient`` is the gradient
        w.r.t. the packed (linear) sigma block: the per-output ``sigma_a`` block
        (length ``n_outputs``) followed by the compact ``sigma_m`` block (one
        entry per combined output, in ``self.combined_output_indices`` order).
        The caller concatenates ``[ode_gradient, sigma_gradient]`` to form the
        full parameter gradient.

        Every model uses the same Gaussian per-point term with variance ``s2``,
        residual ``r`` and ``c = 0.5/s2 - r^2/(2*s2^2)``:

            d nll_i / dtheta     = (r/s2 + c * ds2/dp) * (dr/dtheta chain)
            d nll_i / dsigma_a_k = c * 2*sigma_a_k
            d nll_i / dsigma_m_k = c * 2*sigma_m_k * p^2   (combined only)

        The models differ only in ``r`` (log vs linear), ``gradient_row`` (the
        multiplicative model divides ``dp/dtheta`` by ``p`` for ``dr/dtheta``),
        ``s2`` and ``ds2/dp`` (zero unless combined). For additive /
        multiplicative outputs ``c * 2*sigma_a_k`` reduces to the closed-form
        ``d(nll)/d(sigma_a_k) = 1/sigma_a_k - r^2/sigma_a_k^3``.
        """
        param_ids = tuple(values_by_id.keys())
        n_params = len(param_ids)
        sigma_arr = self._sigma_array(sigma)
        n_outputs = len(sigma_arr)
        n_combined = len(self.combined_output_indices)
        zeros_sigma = np.zeros(n_outputs + n_combined, dtype=float)

        values = np.asarray(list(values_by_id.values()), dtype=float)
        if not np.all(np.isfinite(values)):
            return np.inf, np.zeros(n_params), zeros_sigma

        sigma2 = sigma_arr**2
        sigma_m_arr = self._sigma_mult_array(sigma_mult)
        sigma_m2 = sigma_m_arr**2
        noise_models = self.noise_model_by_output

        grad_a = np.zeros(n_outputs, dtype=float)
        grad_m = np.zeros(n_combined, dtype=float)
        nll = 0.0
        total_gradient = np.zeros(n_params, dtype=float)

        for group in groups:
            try:
                y, y_prime = self._optimise_predict_with_sens(group, values_by_id)
            except Exception:
                logger.exception("solve_fwd_sens failed during gradient computation.")
                return np.inf, np.zeros(n_params), zeros_sigma

            if y.shape != (len(group.t_eval), len(group.outputs)):
                return np.inf, np.zeros(n_params), zeros_sigma

            for record in group.records:
                k = self._sigma_index_for_record(group, record)
                noise_model = noise_models[k]
                prediction = y[record.time_index, record.output_index]
                observed = record.value
                gradient_row = y_prime[record.time_index, record.output_index, :]

                # Per-model residual, variance, its prediction-derivative, and the
                # residual's parameter-sensitivity (gradient_row).
                if noise_model == "combined":
                    residual = prediction - observed
                    s2 = self._combined_variance(sigma2[k], sigma_m2[k], prediction)
                    ds2_dp = 2.0 * sigma_m2[k] * prediction
                elif noise_model == "multiplicative":
                    if self._is_filtered_observation(observed):
                        continue
                    prediction = max(prediction, _MULTIPLICATIVE_NOISE_FLOOR)
                    residual = np.log(prediction) - np.log(observed)
                    gradient_row = gradient_row / prediction
                    s2 = sigma2[k]
                    ds2_dp = 0.0
                else:
                    residual = prediction - observed
                    s2 = sigma2[k]
                    ds2_dp = 0.0

                common = 0.5 / s2 - residual * residual / (2.0 * s2 * s2)
                nll += self._gaussian_nll_term(s2, residual)
                total_gradient += (residual / s2 + common * ds2_dp) * gradient_row
                grad_a[k] += common * (2.0 * sigma_arr[k])
                if noise_model == "combined":
                    grad_m[self._sigma_m_pos_by_output[k]] += common * (
                        2.0 * sigma_m_arr[k] * prediction * prediction
                    )

        if not np.isfinite(nll):
            return np.inf, np.zeros(n_params), zeros_sigma

        sigma_gradient = np.concatenate([grad_a, grad_m])
        return float(nll), total_gradient, sigma_gradient

    def optimise_loss_gradient(
        self,
        groups: tuple[OptimisationGroupContext, ...],
        values_by_id: dict[int, float],
        sigma: float = 1.0,
        sigma_mult=None,
    ):
        return self._optimise_loss_gradient(
            groups,
            values_by_id,
            sigma,
            sigma_mult,
        )

    def optimise_diagnostics(
        self,
        optimal_model: np.ndarray,
        sigma: float = 1.0,
        sigma_mult=None,
    ):
        input_ids = self.optimise_input_ids
        n_params = len(input_ids)
        values_by_id = {
            input_id: float(value)
            for input_id, value in zip(
                input_ids,
                np.asarray(optimal_model, dtype=float),
            )
        }
        conversion_factors = np.asarray(
            [
                self.get_variable_context(
                    self.get_input_name(input_id)
                ).conversion_factor
                for input_id in input_ids
            ],
            dtype=float,
        )

        noise_models = self.noise_model_by_output
        any_combined = len(self.combined_output_indices) > 0

        sigma = self._sigma_array(sigma)
        sigma2 = sigma * sigma
        sigma_list = [float(s) for s in sigma]
        sigma_variables = list(self.sigma_output_variable_ids)

        # sigma_mult (proportional sigma_m) is only meaningful for combined
        # outputs. Report it per output, with None for non-combined outputs, and
        # None entirely when no output is combined.
        sigma_mult = self._sigma_mult_array(sigma_mult)
        sigma_mult2 = sigma_mult * sigma_mult
        if any_combined:
            sigma_mult_list: list[float | None] | None = [
                float(sigma_mult[k]) if noise_models[k] == "combined" else None
                for k in range(len(noise_models))
            ]
        else:
            sigma_mult_list = None

        predictions_list = []
        residuals_list = []
        observations_list = []
        jacobian_rows = []
        residual_values = []
        weights = []
        n_filtered = 0
        # Sum of log(observed) over non-filtered observations, used to restore the
        # change-of-variables Jacobian of the log-space (multiplicative) likelihood
        # when reporting the absolute deviance / information criteria.
        sum_log_obs = 0.0

        time_context = self.get_variable_context(self.time_qname)
        time_conversion_factor = time_context.conversion_factor

        for group in self.optimisation_groups:
            try:
                y, y_prime = self.optimise_predict_with_sens(group, values_by_id)
            except Exception:
                logger.exception("diffsol sensitivity solve failed during diagnostics.")
                return {
                    "predictions": None,
                    "residuals": None,
                    "observations": None,
                    "covariance": None,
                    "condition_number": None,
                    "sigma": sigma_list,
                    "sigma_mult": sigma_mult_list,
                    "sigma_variables": sigma_variables,
                    "filtered_observations": 0,
                    "neg2ll": None,
                    "aic": None,
                    "bic": None,
                }

            t_eval = np.asarray(group.t_eval, dtype=float)

            pred_dict = {"group_id": group.group_id}
            pred_dict[time_context.id] = (t_eval / time_conversion_factor).tolist()
            output_contexts = [
                self.get_variable_context(output.qname) for output in group.outputs
            ]
            for i, output in enumerate(group.outputs):
                output_conversion_factor = output_contexts[i].conversion_factor
                pred_dict[output.id] = (y[:, i] / output_conversion_factor).tolist()
            predictions_list.append(pred_dict)

            obs_residuals_per_output = {i: [] for i in range(len(group.outputs))}
            obs_observations_per_output = {i: [] for i in range(len(group.outputs))}

            for record in group.records:
                t_idx = record.time_index
                o_idx = record.output_index
                k = self._sigma_index_for_record(group, record)
                noise_model = noise_models[k]
                prediction = y[t_idx, o_idx]
                observed = record.value

                if noise_model == "multiplicative":
                    if self._is_filtered_observation(observed):
                        n_filtered += 1
                        continue
                    prediction = max(prediction, _MULTIPLICATIVE_NOISE_FLOOR)
                    residual = np.log(prediction) - np.log(observed)
                    jac_row = y_prime[t_idx, o_idx, :] / prediction
                    residual_for_output = residual / sigma[k]
                    weight = 1.0 / sigma2[k]
                    sum_log_obs += float(np.log(observed))
                elif noise_model == "combined":
                    residual = prediction - observed
                    # Per-point (heteroscedastic) variance and weight. The
                    # standardised residual is dimensionless (residual and the
                    # noise sd are both in model units), so no conversion factor
                    # is applied.
                    s2 = self._combined_variance(
                        sigma2[k], sigma_mult2[k], prediction
                    )
                    residual_for_output = residual / np.sqrt(s2)
                    jac_row = y_prime[t_idx, o_idx, :]
                    weight = 1.0 / s2
                else:
                    residual = prediction - observed
                    # Standardised (dimensionless) residual; no conversion factor
                    # (residual and sigma are both in model units).
                    residual_for_output = residual / sigma[k]
                    jac_row = y_prime[t_idx, o_idx, :]
                    weight = 1.0 / sigma2[k]

                obs_residuals_per_output[o_idx].append(float(residual_for_output))
                # Observed value in the same display units as the predictions
                # (record.value is in model units; predictions are divided by the
                # output conversion factor above). Appended in lockstep with the
                # residual so the two stay index-aligned, including under the
                # multiplicative-noise filtering above.
                obs_observations_per_output[o_idx].append(
                    float(observed / output_contexts[o_idx].conversion_factor)
                )
                jacobian_rows.append(jac_row)
                residual_values.append(float(residual))
                weights.append(weight)

            resid_dict = {"group_id": group.group_id}
            obs_dict = {"group_id": group.group_id}
            all_obs_times = sorted(
                set(record.time / time_conversion_factor for record in group.records)
            )
            resid_dict[time_context.id] = all_obs_times
            obs_dict[time_context.id] = all_obs_times
            for i, output in enumerate(group.outputs):
                resid_dict[output.id] = obs_residuals_per_output[i]
                obs_dict[output.id] = obs_observations_per_output[i]
            residuals_list.append(resid_dict)
            observations_list.append(obs_dict)

        # Information criteria (AIC/BIC) from the absolute deviance -2*ln(L).
        # The internal NLL drops the per-observation 0.5*log(2*pi) constant, and
        # multiplicative outputs additionally work in log-space (so they omit the
        # -sum(log(observed)) change-of-variables Jacobian). Both are restored here
        # so the reported values are on the standard absolute scale and comparable
        # across noise models. Free parameters k = optimised inputs + noise sigmas
        # (one sigma per output, plus one extra per combined output).
        info_criteria = self._information_criteria(
            values_by_id=values_by_id,
            sigma=sigma,
            sigma_mult=sigma_mult,
            n_params=n_params,
            n_filtered=n_filtered,
            sum_log_obs=sum_log_obs,
        )

        J = np.array(jacobian_rows)
        residual_arr = np.array(residual_values)
        weight_arr = np.array(weights)

        valid_mask = np.isfinite(residual_arr) & np.all(np.isfinite(J), axis=1)
        J_valid = J[valid_mask]
        resid_valid = residual_arr[valid_mask]
        w_valid = weight_arr[valid_mask]
        n_valid = len(resid_valid)

        if n_valid <= n_params:
            return {
                "predictions": predictions_list,
                "residuals": residuals_list,
                "observations": observations_list,
                "covariance": None,
                "condition_number": None,
                "sigma": sigma_list,
                "sigma_mult": sigma_mult_list,
                "sigma_variables": sigma_variables,
                "filtered_observations": n_filtered,
                **info_criteria,
            }

        # Weighted (GLS) parameter covariance for heteroscedastic noise:
        # Cov = (J^T W J)^-1 with W = diag(1/sigma_k^2) per residual row.
        JtWJ = J_valid.T @ (w_valid[:, None] * J_valid)
        try:
            cov_model = np.linalg.pinv(JtWJ)
            inv_cf = np.diag(1.0 / conversion_factors)
            cov = inv_cf @ cov_model @ inv_cf
        except np.linalg.LinAlgError:
            cov = None

        condition_number = None
        if cov is not None:
            try:
                std = np.sqrt(np.diag(cov))
                corr = cov / np.outer(std, std)
                singular_values = svd(corr, compute_uv=False)
                s_max = singular_values[0]
                s_min = singular_values[-1]
                condition_number = float(s_max / s_min) if s_min != 0 else np.inf
            except Exception:
                pass

        return {
            "predictions": predictions_list,
            "residuals": residuals_list,
            "observations": observations_list,
            "covariance": cov.tolist() if cov is not None else None,
            "condition_number": condition_number,
            "sigma": sigma_list,
            "sigma_mult": sigma_mult_list,
            "sigma_variables": sigma_variables,
            "filtered_observations": n_filtered,
            **info_criteria,
        }

    def _information_criteria(
        self,
        *,
        values_by_id: dict[int, float],
        sigma,
        sigma_mult,
        n_params: int,
        n_filtered: int,
        sum_log_obs: float,
    ) -> dict[str, float | None]:
        """Compute the absolute deviance -2*ln(L) and the AIC/BIC information
        criteria at the optimal parameters.

        Returns ``{"neg2ll": ..., "aic": ..., "bic": ...}``. All three are ``None``
        when the likelihood is non-finite or there are no observations to fit.
        """
        none_result = {"neg2ll": None, "aic": None, "bic": None}

        n_obs = (
            sum(len(group.records) for group in self.optimisation_groups) - n_filtered
        )
        if n_obs <= 0:
            return none_result

        nll = self._optimise_loss(
            self.optimisation_groups,
            values_by_id,
            sigma,
            sigma_mult,
        )
        if not np.isfinite(nll):
            return none_result

        # One sigma per output, plus one extra (sigma_m) per combined output.
        n_sigma = len(self.sigma_output_variable_ids) + len(
            self.combined_output_indices
        )
        k = n_params + n_sigma

        # -2*ln(L): restore the dropped 0.5*log(2*pi) constant (per observation) and
        # the -sum(log(observed)) log-space Jacobian of the multiplicative outputs
        # (``sum_log_obs`` was accumulated over multiplicative records only, so this
        # is zero when no output is multiplicative).
        neg2ll = 2.0 * nll + n_obs * np.log(2.0 * np.pi) + 2.0 * sum_log_obs

        aic = 2.0 * k + neg2ll
        bic = k * np.log(n_obs) + neg2ll
        return {
            "neg2ll": float(neg2ll),
            "aic": float(aic),
            "bic": float(bic),
        }

    def _validate_optimise_inputs(
        self,
        input_ids: list[int],
        starting: list[float] | None,
        bounds: tuple[list[float], list[float]] | list[list[float]] | None,
    ) -> None:
        if len(input_ids) < 1:
            raise ValueError("Optimisation requires at least one input.")
        if len(set(input_ids)) != len(input_ids):
            raise ValueError("Optimisation inputs must be unique.")
        if starting is None or len(starting) != len(input_ids):
            raise ValueError("Starting values must have the same length as inputs.")
        if bounds is None or len(bounds) != 2:
            raise ValueError("Bounds must be a pair of lower and upper bound lists.")

        lower_bounds, upper_bounds = bounds
        if len(lower_bounds) != len(input_ids) or len(upper_bounds) != len(input_ids):
            raise ValueError("Bounds must have the same length as inputs.")

        for input_id, start, lower, upper in zip(
            input_ids,
            starting,
            lower_bounds,
            upper_bounds,
        ):
            variable = self._variables_by_id[input_id]
            converted_start = self._convert_variable_value(variable, start)
            converted_lower = self._convert_variable_value(variable, lower)
            converted_upper = self._convert_variable_value(variable, upper)
            if converted_lower >= converted_upper:
                raise ValueError(
                    f"Lower bound for {variable.qname} must be less than upper bound."
                )
            if converted_start < converted_lower or converted_start > converted_upper:
                raise ValueError(
                    f"Starting value for {variable.qname} must lie within bounds."
                )

    def _build_optimisation_groups(
        self,
        biomarker_types: list[int] | None,
        subject_groups: list[int] | None,
    ) -> tuple[OptimisationGroupContext, ...]:
        if self._project is None:
            raise ValueError("Optimisation requires the model to belong to a project.")

        biomarker_type_list = self._load_biomarker_types(biomarker_types)

        # Map each fitted output variable (by qname) to the ObservationInfo of the
        # biomarker type mapped to it. Each output variable must correspond to
        # exactly one ObservationInfo; two biomarker types mapping to the same
        # variable would make the per-output noise model / sigma ambiguous.
        self._observation_by_qname: dict[str, ObservationInfo] = {}
        for biomarker_type in biomarker_type_list:
            qname = biomarker_type.variable.qname
            observation = self._observation_by_biomarker_type[biomarker_type.id]
            existing = self._observation_by_qname.get(qname)
            if existing is not None and existing is not observation:
                raise ValueError(
                    "Multiple biomarker types map to the same output variable "
                    f"'{qname}'; each output variable may have only one noise model."
                )
            self._observation_by_qname[qname] = observation

        biomarkers = self._load_biomarkers(biomarker_type_list, subject_groups)
        group_ids = list(
            biomarkers.order_by("subject__group_id")
            .values_list("subject__group_id", flat=True)
            .distinct()
        )
        if len(group_ids) == 0:
            raise ValueError("No biomarker data were found for optimisation.")

        # override time max from the simulation context with the maximum time
        # across all optimisation groups
        self.time_max = biomarkers.aggregate(Max("time"))["time__max"] or self.time_max

        groups = []
        for group_id in group_ids:
            if group_id is None:
                group_biomarkers = biomarkers.filter(subject__group__isnull=True)
                group_name = None
            else:
                group_biomarkers = biomarkers.filter(subject__group_id=group_id)
                group_name = group_biomarkers[0].subject.group.name
            groups.append(
                self._optimisation_group_context(
                    group_id,
                    group_name,
                    group_biomarkers,
                )
            )
        return tuple(groups)

    def _load_biomarker_types(self, biomarker_type_ids: list[int] | None):
        model_variable_qnames = set(self._variables_by_qname)
        biomarker_type_list = load_project_biomarker_types(
            self._project, biomarker_type_ids
        )
        unmapped = [bt.id for bt in biomarker_type_list if bt.variable is None]
        if unmapped:
            raise ValueError(f"Biomarker types are not mapped to variables: {unmapped}")

        invalid = [
            bt.variable.qname
            for bt in biomarker_type_list
            if bt.variable.qname not in model_variable_qnames
        ]
        if invalid:
            raise ValueError(
                f"Biomarker types map to variables outside this model: {invalid}"
            )
        if not biomarker_type_list:
            raise ValueError("No mapped biomarker types were found for optimisation.")

        return biomarker_type_list

    def _load_biomarkers(self, biomarker_type_list, subject_group_ids):
        from pkpdapp.models import Biomarker, SubjectGroup

        biomarkers = Biomarker.objects.filter(
            biomarker_type__in=biomarker_type_list,
            subject__dataset__project=self._project,
        ).select_related(
            "biomarker_type",
            "biomarker_type__variable",
            "biomarker_type__stored_unit",
            "biomarker_type__stored_time_unit",
            "subject",
            "subject__group",
        )

        if subject_group_ids is not None:
            found_group_ids = set(
                SubjectGroup.objects.filter(id__in=subject_group_ids).values_list(
                    "id",
                    flat=True,
                )
            )
            missing_group_ids = set(subject_group_ids) - found_group_ids
            if missing_group_ids:
                raise SubjectGroup.DoesNotExist(
                    f"Subject groups do not exist: {missing_group_ids}"
                )
            biomarkers = biomarkers.filter(subject__group_id__in=subject_group_ids)

        return biomarkers

    def _optimisation_group_context(
        self,
        group_id: int | None,
        group_name: str | None,
        biomarkers,
    ) -> OptimisationGroupContext:
        output_qnames = []
        output_indices = {}
        records = []
        times = []

        for biomarker in biomarkers.order_by("time", "id"):
            biomarker_type = biomarker.biomarker_type
            qname = biomarker_type.variable.qname
            if qname not in output_indices:
                output_indices[qname] = len(output_qnames)
                output_qnames.append(qname)

            myokit_variable = self._myokit_model.get(qname)
            target = self._unit_conversion_target(qname)
            value_conversion_factor = biomarker_type.stored_unit.convert_to(
                myokit_variable.unit(),
                compound=self._compound,
                target=target,
            )
            time_conversion_factor = biomarker_type.stored_time_unit.convert_to(
                self._myokit_model.binding("time").unit(),
                compound=self._compound,
            )

            time_value = float(biomarker.time) * time_conversion_factor
            data_value = float(biomarker.value) * value_conversion_factor
            times.append(time_value)
            records.append(
                {
                    "output_index": output_indices[qname],
                    "time": time_value,
                    "value": data_value,
                }
            )

        t_eval = tuple(sorted(set(times)))
        time_lookup = {time: i for i, time in enumerate(t_eval)}
        record_contexts = tuple(
            OptimisationRecordContext(
                output_index=record["output_index"],
                time_index=time_lookup[record["time"]],
                time=record["time"],
                value=record["value"],
            )
            for record in records
        )

        protocols = self._protocols_for_group(group_id)
        dosing_protocols = tuple(
            self._dosing_protocol_context(protocol) for protocol in protocols
        )
        nonlinear_inputs = self._build_nonlinear_inputs(protocols)

        return OptimisationGroupContext(
            group_id=group_id,
            group_name=group_name,
            dosing_protocols=dosing_protocols,
            outputs=tuple(
                self._output_context(self._get_variable_by_qname(qname))
                for qname in output_qnames
            ),
            t_eval=t_eval,
            records=record_contexts,
            diffsol_ode=self._build_diffsol_ode(
                SimulationGroupContext(
                    group_id=group_id,
                    group_name=group_name,
                    dosing_protocols=dosing_protocols,
                    nonlinear_inputs=nonlinear_inputs,
                ),
                outputs=output_qnames,
            ),
        )
