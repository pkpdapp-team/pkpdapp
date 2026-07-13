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


class OptimiseContext(SimulateContext):
    def __init__(
        self,
        model: Any,
        optimise_inputs: list[int],
        starting: list[float],
        bounds: tuple[list[float], list[float]] | list[list[float]],
        biomarker_types: list[int] | None = None,
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
        self.optimise_input_ids = tuple(optimise_inputs)
        self.optimisation_groups = self._build_optimisation_groups(
            biomarker_types,
            subject_groups,
        )
        self._build_sigma_output_index()

        self._discard_database_state()

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

    def _log_sigma_array(self, log_sigma) -> np.ndarray:
        """
        Normalise ``log_sigma`` to a 1-D array with one entry per distinct output
        variable. A scalar is broadcast across all outputs (used by tests and as
        a convenience default).
        """
        n_outputs = len(self.sigma_output_qnames)
        return np.broadcast_to(
            np.asarray(log_sigma, dtype=float), (n_outputs,)
        ).astype(float, copy=True)

    def _log_sigma_mult_array(self, log_sigma_mult) -> np.ndarray:
        """
        Like ``_log_sigma_array`` for the combined model's second (proportional)
        sigma, defaulting a missing value to 0.0 (sigma_m = 1).
        """
        return self._log_sigma_array(
            0.0 if log_sigma_mult is None else log_sigma_mult
        )

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
    def _combined_nll_term(variance, residual):
        """Per-observation negative log-likelihood contribution of the combined
        noise model (dropping the constant 0.5*log(2*pi))."""
        return 0.5 * np.log(variance) + residual * residual / (2.0 * variance)

    def _optimise_loss(
        self,
        groups: tuple[OptimisationGroupContext, ...],
        values_by_id: dict[int, float],
        log_sigma: float = 0.0,
        log_sigma_mult=None,
        noise_model: str = "additive",
    ):
        values = np.asarray(list(values_by_id.values()), dtype=float)
        if not np.all(np.isfinite(values)):
            return np.inf

        log_sigma_arr = self._log_sigma_array(log_sigma)

        if noise_model == "combined":
            # Heteroscedastic: per-point variance depends on the prediction, so
            # the loss cannot be factored into per-output SSR/sigma^2 terms.
            sigma_a2 = np.exp(2.0 * log_sigma_arr)
            sigma_m2 = np.exp(2.0 * self._log_sigma_mult_array(log_sigma_mult))
            nll = 0.0
            for group in groups:
                try:
                    y = self._optimise_predict(group, values_by_id)
                except Exception:
                    logger.exception("diffsol solve failed during optimisation.")
                    return np.inf
                for record in group.records:
                    k = self._sigma_index_for_record(group, record)
                    prediction = y[record.output_index, record.time_index]
                    residual = prediction - record.value
                    s2 = self._combined_variance(sigma_a2[k], sigma_m2[k], prediction)
                    nll += self._combined_nll_term(s2, residual)
            if not np.isfinite(nll):
                return np.inf
            return float(nll)

        sigma2 = np.exp(2.0 * log_sigma_arr)
        n_outputs = len(log_sigma_arr)
        ssr_per = np.zeros(n_outputs, dtype=float)
        n_obs_per = np.zeros(n_outputs, dtype=float)
        use_multiplicative_noise = noise_model == "multiplicative"
        for group in groups:
            try:
                y = self._optimise_predict(group, values_by_id)
            except Exception:
                logger.exception("diffsol solve failed during optimisation.")
                return np.inf

            for record in group.records:
                k = self._sigma_index_for_record(group, record)
                prediction = y[record.output_index, record.time_index]
                observed = record.value
                if use_multiplicative_noise:
                    if self._is_filtered_observation(observed):
                        continue
                    prediction = max(prediction, _MULTIPLICATIVE_NOISE_FLOOR)
                    residual = np.log(prediction) - np.log(observed)
                else:
                    residual = prediction - observed
                ssr_per[k] += residual * residual
                n_obs_per[k] += 1

        if not np.all(np.isfinite(ssr_per)):
            return np.inf
        nll = float(np.sum(n_obs_per * log_sigma_arr + ssr_per / (2.0 * sigma2)))
        return nll

    def optimise_loss(
        self,
        groups: tuple[OptimisationGroupContext, ...],
        values_by_id: dict[int, float],
        log_sigma: float = 0.0,
        log_sigma_mult=None,
        noise_model: str = "additive",
    ):
        return self._optimise_loss(
            groups, values_by_id, log_sigma, log_sigma_mult, noise_model
        )

    def _optimise_loss_gradient(
        self,
        groups: tuple[OptimisationGroupContext, ...],
        values_by_id: dict[int, float],
        log_sigma: float = 0.0,
        log_sigma_mult=None,
        noise_model: str = "additive",
    ):
        """
        Returns (nll, ode_gradient, sigma_gradient) across prepared groups,
        using forward sensitivities for the requested input variables.

        ``ode_gradient`` is the gradient of the negative log-likelihood w.r.t.
        the optimised ODE input variables. ``sigma_gradient`` is the gradient
        w.r.t. the log-sigma block: length ``n_outputs`` for the additive and
        multiplicative models, or ``2 * n_outputs`` for the combined model,
        ordered as ``[log_sigma_a block, log_sigma_m block]``. The caller simply
        concatenates ``[ode_gradient, sigma_gradient]`` to form the full
        parameter gradient.

        For the additive/multiplicative models the negative log-likelihood is

            nll = Σ_k ( N_k * log_sigma[k] + SSR_k / (2 * sigma_k^2) )

        and ``sigma_gradient[k] = N_k - SSR_k / sigma_k^2``. For the combined
        model the per-observation variance depends on the prediction, so the
        gradient is accumulated point-by-point (see below).
        """
        param_ids = tuple(values_by_id.keys())
        n_params = len(param_ids)
        log_sigma_arr = self._log_sigma_array(log_sigma)
        n_outputs = len(log_sigma_arr)

        if noise_model == "combined":
            zeros_sigma = np.zeros(2 * n_outputs, dtype=float)
        else:
            zeros_sigma = np.zeros(n_outputs, dtype=float)

        values = np.asarray(list(values_by_id.values()), dtype=float)
        if not np.all(np.isfinite(values)):
            return np.inf, np.zeros(n_params), zeros_sigma

        if noise_model == "combined":
            return self._combined_loss_gradient(
                groups, values_by_id, log_sigma_arr, log_sigma_mult
            )

        sigma2 = np.exp(2.0 * log_sigma_arr)
        ssr_per = np.zeros(n_outputs, dtype=float)
        n_obs_per = np.zeros(n_outputs, dtype=float)
        total_gradient = np.zeros(n_params, dtype=float)
        use_multiplicative_noise = noise_model == "multiplicative"

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
                prediction = y[record.time_index, record.output_index]
                observed = record.value
                if use_multiplicative_noise:
                    if self._is_filtered_observation(observed):
                        continue
                    prediction = max(prediction, _MULTIPLICATIVE_NOISE_FLOOR)
                    residual = np.log(prediction) - np.log(observed)
                    gradient_row = (
                        y_prime[record.time_index, record.output_index, :] / prediction
                    )
                else:
                    residual = prediction - observed
                    gradient_row = y_prime[record.time_index, record.output_index, :]

                ssr_per[k] += residual * residual
                n_obs_per[k] += 1
                total_gradient += (residual / sigma2[k]) * gradient_row

        if not np.all(np.isfinite(ssr_per)):
            return np.inf, np.zeros(n_params), zeros_sigma

        nll = float(np.sum(n_obs_per * log_sigma_arr + ssr_per / (2.0 * sigma2)))
        sigma_gradient = n_obs_per - ssr_per / sigma2
        return nll, total_gradient, sigma_gradient

    def _combined_loss_gradient(
        self,
        groups: tuple[OptimisationGroupContext, ...],
        values_by_id: dict[int, float],
        log_sigma_arr: np.ndarray,
        log_sigma_mult,
    ):
        """
        Gradient of the combined-noise negative log-likelihood. For each
        observation of output ``k`` with prediction ``p`` and residual
        ``r = p - observed``, the variance is ``s2 = sigma_a_k^2 + sigma_m_k^2 *
        p^2`` and ``nll_i = 0.5*log(s2) + r^2/(2*s2)``. With
        ``c = 0.5/s2 - r^2/(2*s2^2)`` and ``d(s2)/dp = 2*sigma_m_k^2*p``:

            d nll_i / dp   = r/s2 + c * d(s2)/dp
            d nll_i / da_k = c * 2*sigma_a_k^2       (a_k = log sigma_a_k)
            d nll_i / dm_k = c * 2*sigma_m_k^2 * p^2 (m_k = log sigma_m_k)
        """
        param_ids = tuple(values_by_id.keys())
        n_params = len(param_ids)
        n_outputs = len(log_sigma_arr)
        zeros_sigma = np.zeros(2 * n_outputs, dtype=float)

        sigma_a2 = np.exp(2.0 * log_sigma_arr)
        sigma_m2 = np.exp(2.0 * self._log_sigma_mult_array(log_sigma_mult))

        nll = 0.0
        total_gradient = np.zeros(n_params, dtype=float)
        grad_a = np.zeros(n_outputs, dtype=float)
        grad_m = np.zeros(n_outputs, dtype=float)

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
                prediction = y[record.time_index, record.output_index]
                residual = prediction - record.value
                gradient_row = y_prime[record.time_index, record.output_index, :]

                s2 = self._combined_variance(sigma_a2[k], sigma_m2[k], prediction)
                common = 0.5 / s2 - residual * residual / (2.0 * s2 * s2)
                ds2_dp = 2.0 * sigma_m2[k] * prediction
                dnll_dp = residual / s2 + common * ds2_dp

                total_gradient += dnll_dp * gradient_row
                grad_a[k] += common * (2.0 * sigma_a2[k])
                grad_m[k] += common * (2.0 * sigma_m2[k] * prediction * prediction)
                nll += self._combined_nll_term(s2, residual)

        if not np.isfinite(nll):
            return np.inf, np.zeros(n_params), zeros_sigma

        sigma_gradient = np.concatenate([grad_a, grad_m])
        return float(nll), total_gradient, sigma_gradient

    def optimise_loss_gradient(
        self,
        groups: tuple[OptimisationGroupContext, ...],
        values_by_id: dict[int, float],
        log_sigma: float = 0.0,
        log_sigma_mult=None,
        noise_model: str = "additive",
    ):
        return self._optimise_loss_gradient(
            groups,
            values_by_id,
            log_sigma,
            log_sigma_mult,
            noise_model,
        )

    def optimise_diagnostics(
        self,
        optimal_model: np.ndarray,
        log_sigma: float = 0.0,
        log_sigma_mult=None,
        noise_model: str = "additive",
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

        use_multiplicative_noise = noise_model == "multiplicative"
        is_combined = noise_model == "combined"

        log_sigma_arr = self._log_sigma_array(log_sigma)
        sigma = np.exp(log_sigma_arr)
        sigma2 = sigma * sigma
        sigma_list = [float(s) for s in sigma]
        sigma_variables = list(self.sigma_output_variable_ids)

        if is_combined:
            sigma_mult = np.exp(self._log_sigma_mult_array(log_sigma_mult))
            sigma_mult2 = sigma_mult * sigma_mult
            sigma_mult_list: list[float] | None = [float(s) for s in sigma_mult]
        else:
            sigma_mult_list = None

        predictions_list = []
        residuals_list = []
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

            for record in group.records:
                t_idx = record.time_index
                o_idx = record.output_index
                k = self._sigma_index_for_record(group, record)
                prediction = y[t_idx, o_idx]
                observed = record.value

                if use_multiplicative_noise:
                    if self._is_filtered_observation(observed):
                        n_filtered += 1
                        continue
                    prediction = max(prediction, _MULTIPLICATIVE_NOISE_FLOOR)
                    residual = np.log(prediction) - np.log(observed)
                    jac_row = y_prime[t_idx, o_idx, :] / prediction
                    residual_for_output = residual / sigma[k]
                    weight = 1.0 / sigma2[k]
                    sum_log_obs += float(np.log(observed))
                elif is_combined:
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
                jacobian_rows.append(jac_row)
                residual_values.append(float(residual))
                weights.append(weight)

            resid_dict = {"group_id": group.group_id}
            all_obs_times = sorted(
                set(record.time / time_conversion_factor for record in group.records)
            )
            resid_dict[time_context.id] = all_obs_times
            for i, output in enumerate(group.outputs):
                resid_dict[output.id] = obs_residuals_per_output[i]
            residuals_list.append(resid_dict)

        # Information criteria (AIC/BIC) from the absolute deviance -2*ln(L).
        # The internal NLL drops the per-observation 0.5*log(2*pi) constant, and
        # the multiplicative model additionally works in log-space (so it omits the
        # -sum(log(observed)) change-of-variables Jacobian). Both are restored here
        # so the reported values are on the standard absolute scale and comparable
        # across noise models. Free parameters k = optimised inputs + noise sigmas
        # (one sigma per output, or two per output for the combined model).
        info_criteria = self._information_criteria(
            values_by_id=values_by_id,
            log_sigma=log_sigma,
            log_sigma_mult=log_sigma_mult,
            noise_model=noise_model,
            n_params=n_params,
            n_filtered=n_filtered,
            sum_log_obs=sum_log_obs,
            is_combined=is_combined,
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
        log_sigma,
        log_sigma_mult,
        noise_model: str,
        n_params: int,
        n_filtered: int,
        sum_log_obs: float,
        is_combined: bool,
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
            log_sigma,
            log_sigma_mult,
            noise_model,
        )
        if not np.isfinite(nll):
            return none_result

        n_sigma = len(self.sigma_output_variable_ids) * (2 if is_combined else 1)
        k = n_params + n_sigma

        # -2*ln(L): restore the dropped 0.5*log(2*pi) constant (per observation) and,
        # for the multiplicative model, the -sum(log(observed)) log-space Jacobian.
        neg2ll = 2.0 * nll + n_obs * np.log(2.0 * np.pi)
        if noise_model == "multiplicative":
            neg2ll += 2.0 * sum_log_obs

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
        from pkpdapp.models import BiomarkerType

        model_variable_qnames = set(self._variables_by_qname)
        biomarker_type_qs = BiomarkerType.objects.filter(dataset__project=self._project)

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

        biomarker_type_list = list(
            biomarker_type_qs.select_related(
                "variable",
                "stored_unit",
                "stored_time_unit",
            ).order_by("id")
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
