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

from pkpdapp.models.simulate_context import (
    OutputContext,
    SimulationGroupContext,
    SimulateContext,
)

logger = logging.getLogger(__name__)


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
            use_diffsol=use_diffsol,
            time_max=time_max,
            build_simulation_groups=False,
            discard_database_state=False,
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
        self._discard_database_state()

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

    def _optimise_loss(
        self,
        groups: tuple[OptimisationGroupContext, ...],
        values_by_id: dict[int, float],
        use_multiplicative_noise=False,
    ):
        values = np.asarray(list(values_by_id.values()), dtype=float)
        if not np.all(np.isfinite(values)):
            return np.inf

        total = 0.0
        for group in groups:
            try:
                y = self._optimise_predict(group, values_by_id)
            except Exception:
                logger.exception("diffsol solve failed during optimisation.")
                return np.inf

            for record in group.records:
                prediction = y[record.output_index, record.time_index]
                observed = record.value
                if use_multiplicative_noise:
                    if prediction <= 0 or observed <= 0:
                        return np.inf
                    residual = np.log(prediction) - np.log(observed)
                else:
                    residual = prediction - observed
                total += residual * residual

        if not np.isfinite(total):
            return np.inf
        return float(total)

    def optimise_loss(
        self,
        groups: tuple[OptimisationGroupContext, ...],
        values_by_id: dict[int, float],
        use_multiplicative_noise=False,
    ):
        return self._optimise_loss(groups, values_by_id, use_multiplicative_noise)

    def _optimise_loss_gradient(
        self,
        groups: tuple[OptimisationGroupContext, ...],
        values_by_id: dict[int, float],
        use_multiplicative_noise=False,
    ):
        """
        Returns the loss and gradient across prepared groups, using
        forward sensitivities for the requested input variables.
        """
        param_ids = tuple(values_by_id.keys())
        values = np.asarray(list(values_by_id.values()), dtype=float)
        if not np.all(np.isfinite(values)):
            return np.inf, np.zeros(len(param_ids))

        n_params = len(param_ids)
        total_loss = 0.0
        total_gradient = np.zeros(n_params, dtype=float)

        for group in groups:
            try:
                y, y_prime = self._optimise_predict_with_sens(group, values_by_id)
            except Exception:
                logger.exception("solve_fwd_sens failed during gradient computation.")
                return np.inf, np.zeros(n_params)

            if y.shape != (len(group.t_eval), len(group.outputs)):
                return np.inf, np.zeros(n_params)

            for record in group.records:
                prediction = y[record.time_index, record.output_index]
                observed = record.value
                if use_multiplicative_noise:
                    if prediction <= 0 or observed <= 0:
                        return np.inf, np.zeros(n_params)
                    residual = np.log(prediction) - np.log(observed)
                    gradient_row = (
                        y_prime[record.time_index, record.output_index, :] / prediction
                    )
                else:
                    residual = prediction - observed
                    gradient_row = y_prime[record.time_index, record.output_index, :]

                total_loss += residual * residual
                total_gradient += 2.0 * residual * gradient_row

        if not np.isfinite(total_loss):
            return np.inf, np.zeros(n_params)
        return float(total_loss), total_gradient

    def optimise_loss_gradient(
        self,
        groups: tuple[OptimisationGroupContext, ...],
        values_by_id: dict[int, float],
        use_multiplicative_noise=False,
    ):
        return self._optimise_loss_gradient(
            groups,
            values_by_id,
            use_multiplicative_noise,
        )

    def optimise_diagnostics(
        self,
        optimal_model: np.ndarray,
        use_multiplicative_noise=False,
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
                self.get_variable_context(self.get_input_name(input_id)).conversion_factor
                for input_id in input_ids
            ],
            dtype=float,
        )

        predictions_list = []
        residuals_list = []
        jacobian_rows = []
        residual_values = []

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
                }

            t_eval = np.asarray(group.t_eval, dtype=float)

            pred_dict = {"group_id": group.group_id}
            pred_dict[time_context.id] = (t_eval / time_conversion_factor).tolist()
            output_contexts = [
                self.get_variable_context(output.qname) for output in group.outputs
            ]
            for i, output in enumerate(group.outputs):
                output_conversion_factor = output_contexts[i].conversion_factor
                pred_dict[output.id] = (
                    y[:, i] / output_conversion_factor
                ).tolist()
            predictions_list.append(pred_dict)

            obs_residuals_per_output = {i: [] for i in range(len(group.outputs))}

            for record in group.records:
                t_idx = record.time_index
                o_idx = record.output_index
                prediction = y[t_idx, o_idx]
                observed = record.value

                if use_multiplicative_noise:
                    if prediction <= 0 or observed <= 0:
                        residual = np.nan
                        jac_row = np.full(n_params, np.nan)
                    else:
                        residual = np.log(prediction) - np.log(observed)
                        jac_row = y_prime[t_idx, o_idx, :] / prediction
                    residual_for_output = residual
                else:
                    residual = prediction - observed
                    output_conversion_factor = output_contexts[o_idx].conversion_factor
                    residual_for_output = residual / output_conversion_factor
                    jac_row = y_prime[t_idx, o_idx, :]

                obs_residuals_per_output[o_idx].append(float(residual_for_output))
                jacobian_rows.append(jac_row)
                residual_values.append(float(residual))

            resid_dict = {"group_id": group.group_id}
            all_obs_times = sorted(
                set(record.time / time_conversion_factor for record in group.records)
            )
            resid_dict[time_context.id] = all_obs_times
            for i, output in enumerate(group.outputs):
                resid_dict[output.id] = obs_residuals_per_output[i]
            residuals_list.append(resid_dict)

        J = np.array(jacobian_rows)
        residual_arr = np.array(residual_values)

        valid_mask = np.isfinite(residual_arr) & np.all(np.isfinite(J), axis=1)
        J_valid = J[valid_mask]
        resid_valid = residual_arr[valid_mask]
        n_valid = len(resid_valid)

        if n_valid <= n_params:
            return {
                "predictions": predictions_list,
                "residuals": residuals_list,
                "covariance": None,
                "condition_number": None,
            }

        rss = float(np.dot(resid_valid, resid_valid))
        sigma2 = rss / (n_valid - n_params)

        JtJ = J_valid.T @ J_valid
        try:
            cov_model = sigma2 * np.linalg.pinv(JtJ)
            inv_cf = np.diag(1.0 / conversion_factors)
            cov = inv_cf @ cov_model @ inv_cf
        except np.linalg.LinAlgError:
            cov = None

        condition_number = None
        if cov is not None:
            try:
                singular_values = svd(cov, compute_uv=False)
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
            variable = self._variables_by_id.get(input_id)
            if variable is None:
                from pkpdapp.models import Variable

                raise Variable.DoesNotExist(
                    f"Optimisation input variables do not exist: {[input_id]}"
                )
            if not variable.constant:
                raise ValueError(
                    f"Optimisation input {variable.qname} must be a constant variable."
                )
            if variable.qname.endswith("_tlag_ud"):
                raise ValueError(
                    "Optimising tlag variables is not supported by this method."
                )

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
            if variable.id not in self._input_index_by_variable_id:
                raise ValueError(
                    "Optimisation inputs are missing from context inputs: "
                    f"[{variable.id}]"
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
