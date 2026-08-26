#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import logging
import threading
from collections import namedtuple

import myokit
import numpy as np
import pints
from django.core.cache import cache
from myokit.formats.mathml import MathMLExpressionWriter
from myokit.formats.sbml import SBMLParser

from pkpdapp.models.optimise_context import (
    OptimiseContext,
    OptimiseResult,
)
from .uncertainty_simulation_mixin import UncertaintySimulationMixin

logger = logging.getLogger(__name__)

lock = threading.Lock()

# Links a covariate to the model Variable id of its sampled-value input. The
# centring reference is baked into the model as a fixed constant (see
# ``covariate_effects._reference_value``), so it is not passed at run time.
CovariateBinding = namedtuple("CovariateBinding", ["covariate", "input_id"])


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
        # sort equations by their serialised MathML so the order is stable across
        # runs AND myokit versions/environments (myokit's equations() iteration
        # order is non-deterministic, and its Equation.__str__ form — used as a
        # previous sort key — varies between versions, reordering the output)
        equations = sorted(
            cls._serialise_equation(e) for e in c.equations(bound=False, const=False)
        )
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

    def _covariate_bindings(self) -> list[CovariateBinding]:
        """Return the covariate bindings for this model.

        A covariate's value is a single input variable in the ``Covariates``
        component, shared across every parameter that uses it, so bindings are
        deduplicated by covariate. Each binding pairs a :class:`Covariate` (the
        home of the sampling logic) with the model ``Variable`` id of its value
        input, used to extend the Monte-Carlo dynamic inputs (see
        ``simulate_uncertainty``). The centring reference is baked into the model,
        so no median id is needed.
        """
        from pkpdapp.utils.covariate_effects import covariate_input_name

        bindings: list[CovariateBinding] = []
        if not hasattr(self, "derived_variables"):
            return bindings

        seen = set()
        for dv in self.derived_variables.all():
            if not dv.is_covariate():
                continue
            cov_name = covariate_input_name(dv)
            if cov_name in seen:
                continue
            seen.add(cov_name)
            input_var = self.variables.filter(qname=f"Covariates.{cov_name}").first()
            if input_var is None:
                continue
            covariate = dv.get_covariate()
            bindings.append(
                CovariateBinding(covariate=covariate, input_id=input_var.id)
            )

        return bindings

    def _subject_group(self, group_id):
        """Return the :class:`SubjectGroup` for ``group_id`` (``None`` if none)."""
        if group_id is None:
            return None
        from pkpdapp.models import SubjectGroup

        return SubjectGroup.objects.filter(id=group_id).first()

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
                - "parameters": {<variable id>: [sampled value per individual]} for
                  each distributed parameter and covariate input (empty for a
                  deterministic run)
        """

        variables = dict(variables or {})
        variable_distributions = self._collect_variable_distributions(variables)
        variable_correlations = self._collect_variable_correlations(
            variable_distributions
        )
        covariate_bindings = self._covariate_bindings()
        # validate all distributions up front so the sampling pipeline
        # (simulate_uncertainty) can assume everything is valid
        self._validate_variable_distributions(variables, variable_distributions)
        if not variable_distributions and not covariate_bindings:
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
            covariate_bindings=covariate_bindings,
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

    _GRADIENT_OPTIMISE_METHODS = frozenset({"gradient_descent", "adam", "irprop"})

    @classmethod
    def _build_parameter_transformation(
        cls, log_mask, linear_lower, linear_upper, method
    ):
        """Build the pints parameter transformation for ``optimise``.

        One sub-transformation per parameter (log then linear sigma block), in
        the same order as ``log_mask`` / ``linear_lower`` / ``linear_upper``:

        - Log-scale parameters always use a log transformation (a genuine
          log-uniform search).
        - Linear-scale parameters depend on the optimiser. Gradient methods
          explore an *unbounded* space (pints does not hard-enforce boundaries
          for them), so they use the rectangular-boundaries (logit)
          transformation, which maps ``[lower, upper]`` onto all reals and keeps
          them from being trapped at a hard bound. Gradient-free methods use an
          affine unit-cube transformation.

        """
        is_gradient_method = method in cls._GRADIENT_OPTIMISE_METHODS

        def linear_transformation(lo, hi):
            if is_gradient_method:
                return pints.RectangularBoundariesTransformation([lo], [hi])
            return pints.UnitCubeTransformation([lo], [hi])

        return pints.ComposedTransformation(
            *[
                pints.LogTransformation(1) if log else linear_transformation(lo, hi)
                for log, lo, hi in zip(log_mask, linear_lower, linear_upper)
            ]
        )

    def optimise(
        self,
        parameters,
        observations,
        subject_groups=None,
        max_iterations=None,
        method="pso",
    ) -> OptimiseResult:
        """
        Fits the model against the data indicated

        The biomarker types to fit, and the noise model used for each, are given
        by ``observations`` (a list of :class:`ObservationInfo`). Each observation
        point contributes to the loss according to the noise model of *its*
        biomarker type, so different biomarkers can use different noise models in
        the same fit. Three noise models are supported per observation:
          - "additive":       y ~ N(y_hat, sigma_a^2)
          - "multiplicative": log(y) ~ N(log(y_hat), sigma^2) (log-normal)
          - "combined":       y ~ N(y_hat, sigma_a^2 + sigma_m^2 * y_hat^2)

        For additive / multiplicative outputs the loss is the negative
        log-likelihood factored per output variable k:

            nll = Σ_k ( N_k * log_sigma_k + SSR_k / (2 * sigma_k^2) )

        where N_k is the number of observations of output variable k and SSR_k is
        its sum of squared residuals. A "combined" output fits *two* sigmas
        (sigma_a and sigma_m); its per-observation variance depends on the
        prediction, so its contribution is accumulated point-by-point.

        The sigma parameters are carried by each observation: ``sigma`` (sigma_a,
        used by every model) and, for the combined model, ``sigma_mult``
        (sigma_m). Each is optimised in linear or log space exactly like the model
        parameters.

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
        observations: list of ObservationInfo (required)
            the biomarker types to fit and, for each, its noise model and sigma
            parameter(s). Every fitted output variable must correspond to exactly
            one observation (its biomarker type). Each observation carries a
            ``sigma`` ParameterInfo (sigma_a) and, for the "combined" model, a
            ``sigma_mult`` ParameterInfo (sigma_m); each entry's ``starting`` /
            ``lower_bound`` / ``upper_bound`` are the *linear* sigma value and
            bounds and ``use_log_space`` selects log-space optimisation. The sigma
            parameters are packed into the optimiser's canonical output order
            (ascending variable id, reported as ``sigma_variables``): the per-output
            sigma_a block followed by a compact sigma_m block for the combined
            outputs.
        subject_groups: list (optional)
            list of subject groups (ids) to optimise against, None for all
        max_iterations: int (optional)
            maximum number of iterations of the opimisation algorithm (default 100)
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
              deviation per output variable; ``None`` for outputs whose noise model
              is not "combined", and ``None`` entirely when no output is combined
            - "sigma_variables": (list) output variable ids for the sigma arrays
            - "sigma_start": (list) starting sigma_a (linear) per output variable
            - "sigma_bounds": (list of [lo, hi]) linear sigma_a bounds per output
            - "sigma_use_log_space": (list of bool) whether each sigma_a was fit in
              log space
            - "sigma_mult_start": (list or None) starting sigma_m (linear) per
              output variable; per-output with ``None`` for non-combined outputs,
              and ``None`` entirely when no output is combined
            - "sigma_bounds_mult": (list of [lo, hi] or None) linear sigma_m bounds
              per output (same None convention as sigma_mult_start)
            - "sigma_mult_use_log_space": (list of bool or None) whether each
              sigma_m was fit in log space (same None convention as
              sigma_mult_start)
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

        # The context validates ``observations`` (known noise models, one per
        # fitted output variable, sigma_mult present iff combined) and resolves the
        # canonical per-output ordering.
        context = OptimiseContext(
            model=self,
            optimise_inputs=inputs,
            starting=starting,
            bounds=bounds,
            observations=observations,
            subject_groups=subject_groups,
            use_diffsol=True,
        )

        starting = np.asarray(starting, dtype=float)
        lower_bounds = np.asarray(bounds[0], dtype=float)
        upper_bounds = np.asarray(bounds[1], dtype=float)
        n_inputs = len(inputs)

        # The sigma (noise) parameters live inside each observation. Pack them into
        # the context's canonical output order (ascending variable id): the
        # per-output sigma_a block, followed by a compact sigma_m block for the
        # combined outputs (in ``combined_output_indices`` order).
        output_variable_ids = context.sigma_output_variable_ids
        n_outputs = len(output_variable_ids)
        observation_by_output = context.observation_by_output
        combined_output_indices = context.combined_output_indices
        n_combined = len(combined_output_indices)

        noise_parameters = [obs.sigma for obs in observation_by_output] + [
            observation_by_output[k].sigma_mult for k in combined_output_indices
        ]

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
        n_sigma = n_outputs + n_combined

        # Validate: log-space parameters need a non-negative lower bound and a
        # positive starting value (log is undefined otherwise); every parameter
        # needs lower < upper.
        names = (
            [f"parameter {input_id}" for input_id in inputs]
            + [f"sigma {vid}" for vid in output_variable_ids]
            + [f"sigma_mult {output_variable_ids[k]}" for k in combined_output_indices]
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
        # transformation (and its Jacobian for the gradient). See
        # ``_build_parameter_transformation`` for the per-parameter choice.
        transformation = self._build_parameter_transformation(
            log_mask, linear_lower, linear_upper, method
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
            """Split the packed linear sigma block into (sigma_a, sigma_m_full).

            ``sigma_a`` is the per-output block (length ``n_outputs``).
            ``sigma_m_full`` is a length-``n_outputs`` array with the compact
            sigma_m values scattered into ``combined_output_indices`` (other
            entries are inert and never read for non-combined outputs).
            """
            sigma_block = np.asarray(sigma_block, dtype=float)
            sigma_a = sigma_block[:n_outputs]
            sigma_m_compact = sigma_block[n_outputs:]
            sigma_m_full = np.ones(n_outputs, dtype=float)
            for position, k in enumerate(combined_output_indices):
                sigma_m_full[k] = sigma_m_compact[position]
            return sigma_a, sigma_m_full

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
        )

        # Multiplicative outputs drop observations at or below the observed-value
        # floor (log(observed) is undefined near zero); other noise models never
        # filter. If every observation was filtered there is nothing left to fit.
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
        # space. The proportional (``*_mult``) block is reported per output, with
        # None for non-combined outputs (and None entirely when no output is
        # combined). The packed sigma_m block (sigma_start_lin[n_outputs:], ...) is
        # compact, in combined_output_indices order, so it is scattered back out.
        if n_combined > 0:
            sigma_mult_start = [None] * n_outputs
            sigma_bounds_mult = [None] * n_outputs
            sigma_mult_use_log_space = [None] * n_outputs
            for position, k in enumerate(combined_output_indices):
                idx = n_outputs + position
                sigma_mult_start[k] = float(sigma_start_lin[idx])
                sigma_bounds_mult[k] = [
                    float(sigma_lower_lin[idx]),
                    float(sigma_upper_lin[idx]),
                ]
                sigma_mult_use_log_space[k] = bool(sigma_log[idx])
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
