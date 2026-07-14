#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import logging
import threading

import myokit
import numpy as np
import pints
from django.core.cache import cache
from myokit.formats.mathml import MathMLExpressionWriter
from myokit.formats.sbml import SBMLParser

from pkpdapp.models.optimise_context import (
    NOISE_MODELS,
    OptimiseContext,
    OptimiseResult,
)
from .uncertainty_simulation_mixin import UncertaintySimulationMixin

logger = logging.getLogger(__name__)

lock = threading.Lock()


class MyokitModelMixin(UncertaintySimulationMixin):

    def _get_myokit_model_cache_key(self):
        return "myokit_model_{}_{}".format(self._meta.db_table, self.id)

    @staticmethod
    def sbml_string_to_mmt(sbml):
        model = MyokitModelMixin.parse_sbml_string(sbml)
        return model.code()

    @staticmethod
    def parse_sbml_string(sbml):
        with lock:
            model = SBMLParser().parse_string(str.encode(sbml)).myokit_model()
        return model

    @staticmethod
    def parse_mmt_string(mmt):
        with lock:
            model, _, _ = myokit.parse(mmt)
        return model

    def create_myokit_model(self):
        return self.parse_mmt_string(self.mmt)

    def get_myokit_model(self):
        key = self._get_myokit_model_cache_key()
        with lock:
            myokit_model = cache.get(key)
        if myokit_model is None:
            myokit_model = self.create_myokit_model()
            cache.set(key, myokit_model, timeout=None)
        return myokit_model

    def is_variables_out_of_date(self):
        model = self.get_myokit_model()

        # TODO: is this sufficient, we are also updating on save
        # so I think it should be ok....?
        all_const_variables = self.variables.filter(constant=True)
        myokit_variable_count = sum(1 for _ in model.variables(const=True, sort=True))
        # check if variables need updating
        return len(all_const_variables) != myokit_variable_count

    def update_simulator(self):
        return None

    def update_model(self):
        logger.info("UPDATE MODEL")
        # delete model cache
        cache.delete(self._get_myokit_model_cache_key())

        # update the variables of the model
        from pkpdapp.models import Variable

        removed_variables = self.calculate_removed_variables()

        model = self.get_myokit_model()
        new_variables = []
        old_variables = []
        for v in model.variables(const=True, sort=True):
            if v.is_literal() and v.qname() not in removed_variables:
                v = Variable.get_variable(self, v)
                if v._state.adding:
                    new_variables.append(v)
                else:
                    # parameters could originally be outputs
                    if not v.constant:
                        v.constant = True
                        v.save()
                    old_variables.append(v)

        new_states = []
        old_states = []
        for v in model.variables(state=True, sort=True):
            if v.qname() not in removed_variables:
                v = Variable.get_variable(self, v)
                if v._state.adding:
                    new_states.append(v)
                else:
                    old_states.append(v)

        new_outputs = []
        old_outputs = []
        for v in model.variables(const=False, state=False, sort=True):
            if v.qname() not in removed_variables:
                v = Variable.get_variable(self, v)
                if v._state.adding:
                    # if output not in states set state false
                    # so only states with initial conditions as
                    # parameters will have state set to true
                    if v not in new_states and v.state is True:
                        v.state = False

                    new_outputs.append(v)
                else:
                    # outputs could originally be parameters
                    if v.constant:
                        v.constant = False
                        v.save()
                    old_outputs.append(v)

        all_new_variables = new_variables + new_states + new_outputs
        all_old_variables = old_variables + old_states + old_outputs
        logger.debug("ALL NEW VARIABLES")
        for v in all_new_variables:
            if v.unit is not None:
                logger.debug(
                    f"{v.qname} [{v.unit.symbol}], id = {v.id} "
                    f"constant = {v.constant}, state = {v.state}"
                )
            else:
                logger.debug(
                    f"{v.qname}, id = {v.id} constant = {v.constant}, state = {v.state}"
                )

        logger.debug("ALL OLD VARIABLES")
        for v in all_old_variables:
            if v.unit is not None:
                logger.debug(
                    f"{v.qname} [{v.unit.symbol}], id = {v.id} "
                    f"constant = {v.constant}, state = {v.state}"
                )
            else:
                logger.debug(
                    f"{v.qname}, id = {v.id} constant = {v.constant}, state = {v.state}"
                )

        # delete all variables that are not in new
        for variable in self.variables.all():
            if variable not in all_old_variables:
                logger.debug(f"DELETING VARIABLE {variable.qname} (id = {variable.id})")
                variable.delete()

        # for library models: set created variables to defaults
        if (
            self.is_library_model
            and hasattr(self, "reset_params_to_defaults")
            and len(new_variables) > 0
        ):
            project = self.get_project()
            if project is not None:
                species = project.species
                compound_type = project.compound.compound_type
                self.reset_params_to_defaults(species, compound_type, new_variables)
                # loop through all new variables
                # and set units for concentration variables
                for v in all_new_variables:
                    if v.unit is not None:
                        compatible_units = v.unit.get_compatible_units(
                            compound=project.compound
                        )
                        default_unit_symbol = None
                        if v.name == "calc_C1_f":
                            default_unit_symbol = "ng/mL"
                        elif v.name.startswith("C"):
                            if v.name.startswith("CT"):
                                default_unit_symbol = "pg/mL"
                            elif compound_type == "SM":
                                default_unit_symbol = "ng/mL"
                            elif compound_type == "LM":
                                default_unit_symbol = "µg/mL"
                        if default_unit_symbol is not None:
                            for cu in compatible_units:
                                if cu.symbol == default_unit_symbol:
                                    v.unit = cu
                                    break

        # save all new variables
        Variable.objects.bulk_create(all_new_variables)

    def calculate_removed_variables(self):
        removed_variables = []
        if self.is_library_model:
            removed_variables += [
                "PKCompartment.b_term",
                "PKCompartment.c_term",
                "PKCompartment.RateAbs",
            ]
            if not getattr(self, "has_saturation", True):
                removed_variables += ["PKCompartment.CLmax"]
            if not getattr(self, "has_effect", True):
                removed_variables += [
                    "PKCompartment.Ce",
                    "PKCompartment.AUCe",
                    "PKCompartment.ke0",
                    "PKCompartment.Kpu",
                    "PKCompartment.Kp",
                ]
            if not getattr(self, "has_hill_coefficient", True):
                removed_variables += [
                    "PDCompartment.HC",
                    "PDCompartment.HC1st",
                    "PDCompartment.HC2nd",
                ]
            # tlag now on per variable basis
            removed_variables += ["PKCompartment.tlag"]
            if not getattr(self, "has_bioavailability", True):
                removed_variables += ["PKCompartment.F"]
            if not getattr(self, "has_anti_drug_antibodies", True):
                removed_variables += ["PKCompartment.CLada", "PKCompartment.tada"]
        return removed_variables

    @staticmethod
    def _serialise_equation(equ):
        writer = MathMLExpressionWriter()
        writer.set_mode(presentation=True)
        return writer.eq(equ)

    @staticmethod
    def _serialise_variable(var):
        return {
            "name": var.name(),
            "qname": var.qname(),
            "unit": str(var.unit()),
            "default_value": float(var.value()),
            "lower_bound": 0.0,
            "upper_bound": 2.0,
            "scale": "LN",
        }

    @classmethod
    def _serialise_component(cls, c):
        states = [
            cls._serialise_variable(s) for s in c.variables(state=True, sort=True)
        ]
        variables = [
            cls._serialise_variable(v) for v in c.variables(const=True, sort=True)
        ]
        outputs = [
            cls._serialise_variable(o) for o in c.variables(const=False, sort=True)
        ]
        equations = [
            cls._serialise_equation(e) for e in c.equations(bound=False, const=False)
        ]
        return {
            "name": c.name(),
            "states": states,
            "variables": variables,
            "outputs": outputs,
            "equations": equations,
        }

    def components(self):
        """
        outputs are dependent (e.g. y) and independent (e.g. time)
        variables of the model to be solved
        """
        model = self.get_myokit_model()
        return [self._serialise_component(c) for c in model.components(sort=True)]

    def get_time_max(self):
        return self.time_max

    def _collect_variable_distributions(self, variables):
        """Return ``{qname: Distribution}`` for constant variables that have one.

        Also ensures ``variables`` carries the typical value P for each distributed
        variable: the caller-supplied override if present, otherwise the variable's
        default value. ``variables`` is mutated in place (``simulate`` passes a copy).
        """
        variable_distributions = {}
        for variable in self.variables.filter(constant=True):
            # reverse one-to-one access returns None when no distribution exists
            distribution = getattr(variable, "distribution", None)
            if distribution is None:
                continue
            variables.setdefault(variable.qname, variable.get_default_value())
            variable_distributions[variable.qname] = distribution
        return variable_distributions

    def _collect_variable_correlations(self, variable_distributions):
        """Return ``{(qname_i, qname_j): coefficient}`` for correlated pairs.

        Only pairs where both variables carry a distribution (i.e. are keys of
        ``variable_distributions``) are returned; any pair without a
        :class:`Correlation` row is uncorrelated (coefficient 0) and omitted.
        """
        from pkpdapp.models import Correlation

        distribution_qname = {
            distribution.id: qname
            for qname, distribution in variable_distributions.items()
        }
        variable_correlations = {}
        correlations = Correlation.objects.filter(
            distribution_1__in=distribution_qname,
            distribution_2__in=distribution_qname,
        )
        for correlation in correlations:
            qname_1 = distribution_qname[correlation.distribution_1_id]
            qname_2 = distribution_qname[correlation.distribution_2_id]
            variable_correlations[(qname_1, qname_2)] = correlation.coefficient
        return variable_correlations

    def simulate(
        self,
        outputs=None,
        variables=None,
        time_max=None,
        use_diffsol=True,
        sample_count=None,
        seed=None,
        quantiles=None,
    ):
        """
        Simulate the model, running a Monte-Carlo population whenever any of the
        model's variables carry a :class:`Distribution`.

        The result always uses the uncertainty shape (mean/std/quantiles per
        output). When no variable has a distribution a single deterministic run is
        performed, so ``std`` is zero and every quantile equals the mean.

        Arguments
        ---------
        outputs: list
            list of output names to return
        variables: dict
            dict mapping variable names to values for model parameters. For a
            variable with a distribution this value is the typical value (P).
        time_max: float
            maximum time to simulate to
        use_diffsol: bool
            if True use diffsol, otherwise use the legacy Myokit solver
        sample_count: int (optional)
            number of Monte-Carlo samples to draw when distributions are present
            (default 200). Ignored (forced to 1) when there are no distributions.
        seed: int (optional)
            seed for the random number generator
        quantiles: list (optional)
            quantiles to compute for each output

        Returns
        -------
        output: list of dict
            one dict per subject group, each with:
                - "group_id": id of the subject group, None if no subject group
                - "sample_count": number of samples drawn
                - "time": list of time values
                - "outputs": {<variable id>: {"mean", "std", "quantiles"}}
        """

        variables = dict(variables or {})
        variable_distributions = self._collect_variable_distributions(variables)
        variable_correlations = self._collect_variable_correlations(
            variable_distributions
        )
        # validate all distributions up front so the sampling pipeline
        # (simulate_uncertainty) can assume everything is valid
        self._validate_variable_distributions(variables, variable_distributions)
        if not variable_distributions:
            # deterministic run: a single sample gives std=0 and quantiles==mean
            sample_count = 1
        elif sample_count is None:
            sample_count = 200

        return self.simulate_uncertainty(
            outputs=outputs or [],
            variables=variables,
            time_max=time_max,
            variable_distributions=variable_distributions,
            variable_correlations=variable_correlations,
            sample_count=sample_count,
            seed=seed,
            use_diffsol=use_diffsol,
            quantiles=quantiles,
        )

    _OPTIMISE_METHODS = {
        "cmaes": "CMAES",
        "pso": "PSO",
        "nelder-mead": "NelderMead",
        "gradient_descent": "GradientDescent",
        "adam": "Adam",
        "irprop": "IRPropMinus",
    }

    def optimise(
        self,
        parameters,
        noise_parameters,
        biomarker_types=None,
        subject_groups=None,
        max_iterations=None,
        noise_model="additive",
        method="pso",
    ) -> OptimiseResult:
        """
        Fits the model against the data indicated

        Three noise models are supported, selected by ``noise_model``:
          - "additive":       y ~ N(y_hat, sigma_a^2)
          - "multiplicative": log(y) ~ N(log(y_hat), sigma^2) (log-normal)
          - "combined":       y ~ N(y_hat, sigma_a^2 + sigma_m^2 * y_hat^2)

        For the additive and multiplicative models the loss function is the
        negative log-likelihood with one noise standard deviation sigma_k per
        distinct model output variable being fitted:

            nll = Σ_k ( N_k * log_sigma_k + SSR_k / (2 * sigma_k^2) )

        where N_k is the number of observations of output variable k, SSR_k is
        the sum of squared residuals for that variable, and
        sigma_k = exp(log_sigma_k).

        The combined model fits *two* sigmas per output variable (sigma_a from
        ``log_sigma`` and sigma_m from ``log_sigma_mult``); its per-observation
        variance depends on the prediction so the loss is accumulated
        point-by-point rather than factored per output.

        The package Pints is used for optimisation
        (https://pints.readthedocs.io/en/stable/optimisers/index.html).
        The optimisation method is chosen by the ``method`` argument.
        Gradient-free methods (cmaes, pso, nelder-mead) only require the
        loss function. Gradient-based methods (gradient_descent) also require
        sensitivities, computed via forward sensitivity analysis using
        ``solve_fwd_sens``. The methods ``adam`` and ``irprop`` are provided
        for future compatibility but require a newer pints version exposing
        ``pints.Adam`` / ``pints.IRPropMinus``.

        Arguments
        ---------
        parameters: list of ParameterInfo
            model (ODE input) parameters to optimise. Each carries the input
            ``variable_id`` together with its ``starting`` value and
            ``lower_bound`` / ``upper_bound``. The order chosen here defines the
            order of the ``optimal`` result array.
        noise_parameters: list of ParameterInfo (required)
            noise (sigma) parameters, one per fitted output variable in the
            canonical order (ascending variable id) derived from
            ``biomarker_types`` and reported as ``sigma_variables``. Each entry's
            ``starting`` / ``lower_bound`` / ``upper_bound`` are the *linear* sigma
            value and bounds, and ``use_log_space`` selects whether that sigma is
            optimised in log space — exactly like the model parameters. The first
            ``n_outputs`` entries are the additive sigma_a block; for the
            "combined" noise model a further ``n_outputs`` entries follow for the
            proportional sigma_m block. The length must be ``n_outputs``
            (additive/multiplicative) or ``2 * n_outputs`` (combined); ``None`` or
            a wrong length raises ``ValueError``.
        biomarker_types: list (optional)
            list of biomarker_types (ids) to optimise against, None for all
        subject_groups: list (optional)
            list of subject groups (ids) to optimise against, None for all
        max_iterations: int (optional)
            maximum number of iterations of the opimisation algorithm (default 100)
        noise_model: str (optional)
            noise model, one of "additive" (default), "multiplicative", or
            "combined"
        method: str (optional)
            optimisation method, one of "cmaes", "pso" (default), "nelder-mead",
            "gradient_descent", "adam", "irprop"

        Returns
        -------
        result: OptimiseResult
            A dataclass with the fields below (see ``OptimiseResult``):
            - "optimal": (list) optimal input values (same order as parameters)
            - "loss": (float) value of loss function at optimal
            - "reason": (str) stopping reason
            - "sigma": (list) estimated (additive) noise standard deviation per
              output variable, in the canonical order given by "sigma_variables"
            - "sigma_mult": (list or None) estimated proportional noise standard
              deviation per output variable (combined model only, else None)
            - "sigma_variables": (list) output variable ids for the sigma arrays
            - "sigma_start": (list) starting sigma_a (linear) per output variable
            - "sigma_bounds": (list of [lo, hi]) linear sigma_a bounds per output
            - "sigma_use_log_space": (list of bool) whether each sigma_a was fit in
              log space
            - "sigma_mult_start": (list or None) starting sigma_m (linear) per
              output variable (combined model only, else None)
            - "sigma_bounds_mult": (list of [lo, hi] or None) linear sigma_m bounds
              per output (combined model only, else None)
            - "sigma_mult_use_log_space": (list of bool or None) whether each
              sigma_m was fit in log space (combined model only, else None)
            - "predictions": (list of dicts) simulated values at the optimal
              parameters, one dict per subject group. Each dict has the same
              format as the dicts returned by ``simulate``: keys are
              ``"group_id"`` and integer variable ids, values are lists of
              floats. The time variable is included.
            - "residuals": (list of dicts) normalised residuals at observed data
              points, one dict per subject group. Same format as ``predictions``
              but only contains time-points for which observations exist.
              Residuals are divided by the estimated sigma.
            - "covariance": (list of lists or None) estimated covariance matrix
              of the optimal parameters (n_params x n_params), scaled by the
              estimated sigma^2. ``None`` if the matrix could not be computed
              (e.g. insufficient observations).
            - "condition_number": (float or None) condition number of the
              covariance matrix computed from its singular values. ``None`` if
              the covariance matrix is not available.
            - "filtered_observations": (int) number of observations dropped from
              the fit. Non-zero only for the "multiplicative" noise model, which
              cannot use observations at or below a small floor near zero (since
              it takes log(observed)). Always 0 for the additive and combined
              models.
        """

        if method not in self._OPTIMISE_METHODS:
            raise ValueError(
                f"Unknown optimisation method '{method}'. "
                f"Choose from: {list(self._OPTIMISE_METHODS.keys())}"
            )
        pints_method_name = self._OPTIMISE_METHODS[method]
        pints_method = getattr(pints, pints_method_name, None)
        if pints_method is None:
            raise RuntimeError(
                f"Optimisation method '{method}' ({pints_method_name}) is not "
                f"available in the installed pints version ({pints.__version__}). "
                "Please upgrade pints."
            )

        if noise_model not in NOISE_MODELS:
            raise ValueError(
                f"Unknown noise model '{noise_model}'. "
                f"Choose from: {list(NOISE_MODELS)}"
            )

        if max_iterations is None:
            max_iterations = 100

        # The model parameters arrive as a list of ParameterInfo; unpack them into
        # the positionally-aligned inputs / starting / bounds arrays that the rest
        # of the method (and OptimiseContext) work with. The order chosen by the
        # caller defines the order of the returned ``optimal`` array.
        inputs = [parameter.variable_id for parameter in parameters]
        starting = [parameter.starting for parameter in parameters]
        bounds = (
            [parameter.lower_bound for parameter in parameters],
            [parameter.upper_bound for parameter in parameters],
        )

        context = OptimiseContext(
            model=self,
            optimise_inputs=inputs,
            starting=starting,
            bounds=bounds,
            biomarker_types=biomarker_types,
            subject_groups=subject_groups,
            use_diffsol=True,
        )

        starting = np.asarray(starting, dtype=float)
        lower_bounds = np.asarray(bounds[0], dtype=float)
        upper_bounds = np.asarray(bounds[1], dtype=float)
        n_inputs = len(inputs)

        # Sigma (noise) parameters are required and aligned positionally with the
        # context's canonical output variable ordering (ascending variable id):
        # one linear ParameterInfo per fitted output variable (and, for the
        # combined model, a second block for the proportional sigma_m).
        output_variable_ids = context.sigma_output_variable_ids
        n_outputs = len(output_variable_ids)
        is_combined = noise_model == "combined"
        expected_noise = 2 * n_outputs if is_combined else n_outputs

        if noise_parameters is None:
            raise ValueError("noise_parameters is required.")
        if len(noise_parameters) != expected_noise:
            block_desc = (
                f"two entries per fitted output variable ({expected_noise})"
                if is_combined
                else f"one entry per fitted output variable ({expected_noise})"
            )
            raise ValueError(
                f"noise_parameters must have {block_desc}, "
                f"got {len(noise_parameters)}."
            )

        conversion_factors = np.asarray(
            [
                context.get_variable_context(
                    context.get_input_name(input_id)
                ).conversion_factor
                for input_id in inputs
            ],
            dtype=float,
        )

        # ODE and sigma parameters are treated identically: each is optimised in
        # either linear or log space. Build one combined vector of *linear* values
        # — ODE in model space (user value * conversion factor) followed by the
        # linear sigma block — plus ``log_mask`` marking entries optimised in log
        # space. These drive the per-parameter pints transformation below.
        ode_start = starting * conversion_factors
        ode_lower = lower_bounds * conversion_factors
        ode_upper = upper_bounds * conversion_factors
        ode_log = np.array([bool(p.use_log_space) for p in parameters], dtype=bool)

        sigma_start_lin = np.array([p.starting for p in noise_parameters], dtype=float)
        sigma_lower_lin = np.array(
            [p.lower_bound for p in noise_parameters], dtype=float
        )
        sigma_upper_lin = np.array(
            [p.upper_bound for p in noise_parameters], dtype=float
        )
        sigma_log = np.array(
            [bool(p.use_log_space) for p in noise_parameters], dtype=bool
        )

        linear_start = np.concatenate([ode_start, sigma_start_lin])
        linear_lower = np.concatenate([ode_lower, sigma_lower_lin])
        linear_upper = np.concatenate([ode_upper, sigma_upper_lin])
        log_mask = np.concatenate([ode_log, sigma_log])
        n_sigma = expected_noise

        # Validate: log-space parameters need a non-negative lower bound and a
        # positive starting value (log is undefined otherwise); every parameter
        # needs lower < upper.
        names = (
            [f"parameter {input_id}" for input_id in inputs]
            + ["sigma"] * n_outputs
            + (["sigma_mult"] * n_outputs if is_combined else [])
        )
        for i, name in enumerate(names):
            if linear_lower[i] >= linear_upper[i]:
                raise ValueError(
                    f"{name} lower bound must be less than the upper bound, got "
                    f"[{linear_lower[i]}, {linear_upper[i]}]."
                )
            if log_mask[i]:
                if linear_lower[i] < 0:
                    raise ValueError(
                        f"{name} must have lower_bound >= 0 to be optimised in "
                        f"log space, got {linear_lower[i]}."
                    )
                if linear_start[i] <= 0:
                    raise ValueError(
                        f"{name} must have a positive starting value to be "
                        f"optimised in log space, got {linear_start[i]}."
                    )

        # The error measure works in model space; pints applies each parameter's
        # transformation (and its Jacobian for the gradient). Log-space parameters
        # use a log transformation; the rest use a rectangular-boundaries
        # transformation that maps the bounded interval to an unbounded search
        # space, so gradient optimisers are not trapped by hard bounds.
        transformation = pints.ComposedTransformation(
            *[
                pints.LogTransformation(1)
                if log
                else pints.RectangularBoundariesTransformation([lo], [hi])
                for log, lo, hi in zip(log_mask, linear_lower, linear_upper)
            ]
        )

        # Boundaries (model space) so gradient-free methods (CMA-ES / PSO /
        # Nelder-Mead) respect the log-space parameters' bounds; pints does not
        # hard-enforce them for gradient methods, which is what we want.
        boundaries = pints.RectangularBoundaries(linear_lower, linear_upper)

        # Explicit per-parameter sigma0 (model space). Passing this avoids pints
        # deriving the step size from the transformed bound range, which is
        # infinite for a log-space parameter whose lower bound is 0.
        sigma0 = (linear_upper - linear_lower) / 6.0

        # Model-space start, clamped strictly inside the bounds so the forward
        # transform and pints' initial-position-in-bounds check stay finite.
        span = linear_upper - linear_lower
        x0 = np.clip(
            linear_start,
            linear_lower + 1e-9 * span,
            linear_upper - 1e-9 * span,
        )

        def split_sigma(sigma_block):
            """Split the linear sigma block into (sigma_a, sigma_m). sigma_m is
            None unless the combined model is in use.
            """
            sigma_block = np.asarray(sigma_block, dtype=float)
            if is_combined:
                return sigma_block[:n_outputs], sigma_block[n_outputs:]
            return sigma_block, None

        class OptimiseError(pints.ErrorMeasure):
            def values_by_id(self, values):
                return {
                    input_id: float(value)
                    for input_id, value in zip(
                        inputs,
                        np.asarray(values, dtype=float),
                    )
                }

            def n_parameters(self):
                return n_inputs + n_sigma

            def __call__(self, x):
                # x is in model space (pints applies the transformation).
                x = np.asarray(x, dtype=float)
                sigma_a, sigma_m = split_sigma(x[n_inputs:])
                loss = context.optimise_loss(
                    context.optimisation_groups,
                    self.values_by_id(x[:n_inputs]),
                    sigma=sigma_a,
                    sigma_mult=sigma_m,
                    noise_model=noise_model,
                )
                if np.isfinite(loss) and loss < self.best_loss:
                    self.best_loss = float(loss)
                    self.best_values = x.copy()
                return loss

            def evaluateS1(self, x):
                # x is in model space; the context returns gradients w.r.t. the
                # model values, and pints applies the transformation Jacobian.
                x = np.asarray(x, dtype=float)
                sigma_a, sigma_m = split_sigma(x[n_inputs:])
                try:
                    result = context.optimise_loss_gradient(
                        context.optimisation_groups,
                        self.values_by_id(x[:n_inputs]),
                        sigma=sigma_a,
                        sigma_mult=sigma_m,
                        noise_model=noise_model,
                    )
                    nll, ode_gradient, sigma_gradient = result
                except Exception:
                    logger.exception(
                        "solve_fwd_sens failed during gradient computation."
                    )
                    return np.inf, np.zeros(n_inputs + n_sigma)
                if not np.isfinite(nll):
                    return np.inf, np.zeros(n_inputs + n_sigma)
                total_gradient = np.concatenate([ode_gradient, sigma_gradient])
                loss = float(nll)
                if np.isfinite(loss) and loss < self.best_loss:
                    self.best_loss = loss
                    self.best_values = x.copy()
                return loss, total_gradient

        error = OptimiseError()
        error.best_loss = np.inf
        error.best_values = x0.copy()
        starting_loss = error(x0)
        if not np.isfinite(starting_loss):
            raise RuntimeError(
                "Initial optimisation loss is not finite. Check that the solver "
                "returns all requested dense output times and that data are valid."
            )

        # The controller works in the transformed (search) space: it transforms
        # x0 / boundaries / sigma0 and calls the error with model-space values.
        optimiser = pints.OptimisationController(
            error,
            x0,
            boundaries=boundaries,
            transformation=transformation,
            sigma0=sigma0,
            method=pints_method,
        )
        optimiser.set_max_iterations(max_iterations)
        optimiser.set_log_to_screen(False)

        optimal, loss = optimiser.run()
        # CMA-ES reports the final candidate, which may be worse than previously
        # explored points. Return the best point evaluated during the run.
        if np.isfinite(error.best_loss) and error.best_loss < float(loss):
            optimal = error.best_values
            loss = error.best_loss
        # Work out why the optimiser stopped. pints' OptimisationController
        # halts on several criteria; ``optimiser().stop()`` only reports the
        # optimiser's own internal criterion. When it stops before reaching
        # ``max_iterations`` this is almost always the "max unchanged
        # iterations" convergence criterion (the objective function value stopped
        # improving), so report that rather than misattributing it to the
        # iteration cap.
        iters = optimiser.iterations()
        stop_error = optimiser.optimiser().stop()
        if stop_error:
            reason = f"Converged: {stop_error}"
        elif max_iterations is not None and iters >= max_iterations:
            reason = f"Maximum iterations ({iters}) reached."
        else:
            unchanged_iters, unchanged_threshold = (
                optimiser.max_unchanged_iterations()
                if hasattr(optimiser, "max_unchanged_iterations")
                else (None, None)
            )
            if unchanged_iters is not None:
                reason = (
                    f"Converged after {iters} iterations: the objective "
                    f"function value changed by less than "
                    f"{unchanged_threshold:g} for {unchanged_iters} "
                    f"consecutive iterations."
                )
            else:
                reason = f"Converged after {iters} iterations."

        # run() returns the optimum in model space (pints de-transforms it).
        optimal = np.asarray(optimal, dtype=float)
        ode_optimal = optimal[:n_inputs]
        sigma_a, sigma_m = split_sigma(optimal[n_inputs:])
        diagnostics = context.optimise_diagnostics(
            optimal_model=ode_optimal,
            sigma=sigma_a,
            sigma_mult=sigma_m,
            noise_model=noise_model,
        )

        # Under the multiplicative noise model, observations at or below the
        # observed-value floor are dropped (log(observed) is undefined near zero).
        # If every observation was filtered there is nothing left to fit.
        if noise_model == "multiplicative":
            total_observations = sum(
                len(group.records) for group in context.optimisation_groups
            )
            if diagnostics.get("filtered_observations", 0) >= total_observations:
                raise ValueError(
                    "All observations were filtered out because they are at or "
                    "below the multiplicative-noise threshold "
                    "(values close to zero). The multiplicative noise model "
                    "cannot be used with this data."
                )

        optimal_user = ode_optimal / conversion_factors

        # Sigma start / bounds are reported in linear space (the same units as the
        # fitted ``sigma``), with a flag recording whether each was fit in log
        # space. The proportional (``*_mult``) block only exists for the combined
        # model.
        if is_combined:
            sigma_mult_start = sigma_start_lin[n_outputs:].tolist()
            sigma_bounds_mult = [
                [float(lo), float(hi)]
                for lo, hi in zip(
                    sigma_lower_lin[n_outputs:], sigma_upper_lin[n_outputs:]
                )
            ]
            sigma_mult_use_log_space = [bool(v) for v in sigma_log[n_outputs:]]
        else:
            sigma_mult_start = None
            sigma_bounds_mult = None
            sigma_mult_use_log_space = None

        return OptimiseResult(
            optimal=np.asarray(optimal_user, dtype=float).tolist(),
            loss=float(loss),
            reason=str(reason),
            sigma_start=sigma_start_lin[:n_outputs].tolist(),
            sigma_bounds=[
                [float(lo), float(hi)]
                for lo, hi in zip(
                    sigma_lower_lin[:n_outputs], sigma_upper_lin[:n_outputs]
                )
            ],
            sigma_use_log_space=[bool(v) for v in sigma_log[:n_outputs]],
            sigma_mult_start=sigma_mult_start,
            sigma_bounds_mult=sigma_bounds_mult,
            sigma_mult_use_log_space=sigma_mult_use_log_space,
            # sigma_variables + the diagnostics fields (sigma, predictions,
            # residuals, covariance, condition_number, filtered_observations,
            # neg2ll, aic, bic) are supplied directly by optimise_diagnostics.
            **diagnostics,
        )
