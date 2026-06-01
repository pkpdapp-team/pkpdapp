#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import logging
import threading
from typing import Any, cast

import myokit
import numpy as np
import pints
from django.core.cache import cache
from myokit.formats.mathml import MathMLExpressionWriter
from myokit.formats.sbml import SBMLParser

from pkpdapp.models.optimise_context import OptimiseContext
from pkpdapp.models.simulate_context import SimulateContext
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

    def set_variables_from_inference(self, inference):
        results_for_mle = inference.get_maximum_likelihood()
        for result in results_for_mle:
            inference_var = result.log_likelihood.outputs.first().variable
            # noise variables won't have a model variable
            if inference_var is not None:
                model_var = self.variables.filter(qname=inference_var.qname).first()
            else:
                model_var = None
            if model_var is not None:
                model_var.default_value = result.value
                if (
                    model_var.lower_bound
                    and model_var.lower_bound > model_var.default_value
                ):
                    model_var.lower_bound = model_var.default_value
                if (
                    model_var.upper_bound
                    and model_var.upper_bound < model_var.default_value
                ):
                    model_var.upper_bound = model_var.default_value
                model_var.save()

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

    def simulate(self, outputs=None, variables=None, time_max=None, use_diffsol=True):
        """
        Arguments
        ---------
        outputs: list
            list of output names to return
        variables: dict
            dict mapping variable names to values for model parameters
        time_max: float
            maximum time to simulate to
        use_diffsol: bool
            if True use diffsol, otherwise use the legacy Myokit solver

        Returns
        -------
        output: dict
            a dict with the following key, values:
                - "group_id": id of the subject group, None if no subject group
                - <variable id>: list of time-series values
            There is a <variable id> for all the requested outputs, including time
        """

        context = SimulateContext(
            model=self,
            outputs=outputs or [],
            variables=variables,
            use_diffsol=use_diffsol,
            time_max=time_max,
        )

        result = []
        for simulation_group in context.simulation_groups:
            group_result = cast(
                dict[Any, Any],
                context.simulate_model(simulation_group),
            )
            group_result["group_id"] = simulation_group.group_id
            result.append(group_result)
        return result

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
        inputs,
        starting,
        bounds,
        biomarker_types=None,
        subject_groups=None,
        max_iterations=None,
        use_multiplicative_noise=True,
        method="pso",
    ):
        """
        Fits the model against the data indicated

                two different noise models are supported: gaussian additive
                (i.e. sum of squares)
        and log-normal multiplicative.
                    return None
                For each subject group:
                        1. all variable outputs mapped to biomarker types are found;
                            these
               the requested outputs for the simulation for that subject group
                            group and
               biomarker types, this is collected in a (a) list of time points and
               (b) 2D array where columns are timepoints and the rows arre outputs
               (same order as the requested outputs in 1.).
            3. a diffsol Ode model is contructed using the outputs from 1.

                Then fitting is performed. The loss function for each iteration has the
        following structure:
            - total loss initialised to zero
            - loop through each subject group:
                                - a simulation is performed using that group's
                                    Ode model with solve_dense and the timepoints
                                    collected in step 2
                                - that group's loss is calculated and added to the total
                  loss

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
        inputs: list
            list of input variables (ids) to optimise against
        starting: list
            initial values for the opimisation (same order as inputs)
        bounds: (list, list)
            lower and upper bounds for the opimisation (same order as inputs)
        biomarker_types: list (optional)
            list of biomarker_types (ids) to optimise against, None for all
        subject_groups: list (optional)
            list of subject groups (ids) to optimise against, None for all
        max_iterations: int (optional)
            maximum number of iterations of the opimisation algorithm (default 100)
        use_multiplicative_noise: bool (optional)
            if False (default) use additive noise (sum of squares loss), if True,
            use multiplicative noise (log-normal noise)
        method: str (optional)
            optimisation method, one of "cmaes", "pso" (default), "nelder-mead",
            "gradient_descent", "adam", "irprop"

        Returns
        -------
        result: dict
            - "optimal": (list) optimal input values (same order as inputs)
            - "loss": (float) value of loss function at optimal
            - "reason": (str) stopping reason
            - "predictions": (list of dicts) simulated values at the optimal
              parameters, one dict per subject group. Each dict has the same
              format as the dicts returned by ``simulate``: keys are
              ``"group_id"`` and integer variable ids, values are lists of
              floats. The time variable is included.
            - "residuals": (list of dicts) residuals at observed data points,
              one dict per subject group. Same format as ``predictions`` but
              only contains time-points for which observations exist.
              Residuals are ``prediction - observed`` (additive noise) or
              ``log(prediction) - log(observed)`` (multiplicative noise).
            - "covariance": (list of lists or None) estimated covariance matrix
              of the optimal parameters (n_params x n_params), scaled by the
              residual variance ``RSS / (n_obs - n_params)``. ``None`` if the
              matrix could not be computed (e.g. insufficient observations).
            - "condition_number": (float or None) condition number of the
              covariance matrix computed from its singular values. ``None`` if
              the covariance matrix is not available.
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

        conversion_factors = np.asarray(
            [
                context.get_variable_context(
                    context.get_input_name(input_id)
                ).conversion_factor
                for input_id in inputs
            ],
            dtype=float,
        )
        starting_model = np.asarray(starting, dtype=float) * conversion_factors
        lower_bounds_model = np.asarray(lower_bounds, dtype=float) * conversion_factors
        upper_bounds_model = np.asarray(upper_bounds, dtype=float) * conversion_factors

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
                return len(inputs)

            def __call__(self, x):
                loss = context.optimise_loss(
                    context.optimisation_groups,
                    self.values_by_id(x),
                    use_multiplicative_noise=use_multiplicative_noise,
                )
                if np.isfinite(loss) and loss < self.best_loss:
                    self.best_loss = float(loss)
                    self.best_values = np.asarray(x, dtype=float).copy()
                return loss

            def evaluateS1(self, x):
                try:
                    total_loss, total_gradient = context.optimise_loss_gradient(
                        context.optimisation_groups,
                        self.values_by_id(x),
                        use_multiplicative_noise=use_multiplicative_noise,
                    )
                except Exception:
                    logger.exception(
                        "solve_fwd_sens failed during gradient computation."
                    )
                    return np.inf, np.zeros(len(inputs))
                if not np.isfinite(total_loss):
                    return np.inf, np.zeros(len(inputs))
                loss = float(total_loss)
                if np.isfinite(loss) and loss < self.best_loss:
                    self.best_loss = loss
                    self.best_values = np.asarray(x, dtype=float).copy()
                return loss, total_gradient

        error = OptimiseError()
        error.best_loss = np.inf
        error.best_values = np.asarray(starting_model, dtype=float).copy()
        starting_loss = error(starting_model)
        if not np.isfinite(starting_loss):
            raise RuntimeError(
                "Initial optimisation loss is not finite. Check that the solver "
                "returns all requested dense output times and that data are valid."
            )

        optimiser_start = np.asarray(starting_model, dtype=float)

        boundaries = pints.RectangularBoundaries(
            lower_bounds_model,
            upper_bounds_model,
        )
        optimiser = pints.OptimisationController(
            error,
            optimiser_start,
            boundaries=boundaries,
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
        reason = optimiser.optimiser().stop()
        if reason is None:
            reason = f"Stopped after {optimiser.iterations()} iterations."

        optimal_model = np.asarray(optimal, dtype=float)
        diagnostics = context.optimise_diagnostics(
            optimal_model=optimal_model,
            use_multiplicative_noise=use_multiplicative_noise,
        )

        optimal_user = optimal_model / conversion_factors

        return {
            "optimal": np.asarray(optimal_user, dtype=float).tolist(),
            "loss": float(loss),
            "reason": str(reason),
            **diagnostics,
        }

    def _unit_conversion_target(self, qname):
        if self.is_library_model:
            if "CT1" in qname or "AT1" in qname:
                return 1
            if "CT2" in qname or "AT2" in qname:
                return 2
        return None


def set_administration(model, drug_amount, direct=True):
    r"""
    Sets the route of administration of the compound.

    The compound is administered to the selected compartment either
    directly or indirectly. If it is administered directly, a dose rate
    variable is added to the drug amount's rate of change expression

    .. math ::

        \frac{\text{d}A}{\text{d}t} = \text{RHS} + r_d,

    where :math:`A` is the drug amount in the selected compartment, RHS is
    the rate of change of :math:`A` prior to adding the dose rate, and
    :math:`r_d` is the dose rate.

    The dose rate can be set by :meth:`set_dosing_regimen`.

    If the route of administration is indirect, a dosing compartment
    is added to the model, which is connected to the selected compartment.
    The dose rate variable is then added to the rate of change expression
    of the dose amount variable in the dosing compartment. The drug amount
    in the dosing compartment flows at a linear absorption rate into the
    selected compartment

    .. math ::

        \frac{\text{d}A_d}{\text{d}t} = -k_aA_d + r_d \\
        \frac{\text{d}A}{\text{d}t} = \text{RHS} + k_aA_d,

    where :math:`A_d` is the amount of drug in the dose compartment and
    :math:`k_a` is the absorption rate.

    Setting an indirect administration route changes the number of
    parameters of the model, and resets the parameter names to their
    defaults.

    Parameters
    ----------
    compartment
        Compartment to which doses are either directly or indirectly
        administered.
    amount_var
        Drug amount variable in the compartment. By default the drug amount
        variable is assumed to be 'drug_amount'.
    direct
        A boolean flag that indicates whether the dose is administered
        directly or indirectly to the compartment.
    """
    if not drug_amount.is_state():
        raise ValueError(
            "The variable <" + str(drug_amount) + "> is not a state "
            "variable, and can therefore not be dosed."
        )

    # If administration is indirect, add a dosing compartment and update
    # the drug amount variable to the one in the dosing compartment
    time_unit = _get_time_unit(model)
    if not direct:
        drug_amount = _add_dose_compartment(model, drug_amount, time_unit)

    # Add dose rate variable to the right hand side of the drug amount
    _add_dose_rate(drug_amount, time_unit)


def get_protocol(events):
    """

    Parameters
    ----------
    events
        list of (level, start, duration)
    """
    myokit_protocol = myokit.Protocol()
    for e in events:
        myokit_protocol.schedule(e[0], e[1], e[2])

    return myokit_protocol


def _get_pacing_label(variable):
    return f"pace_{variable.qname().replace('.', '_')}"


def _add_dose_rate(drug_amount, time_unit):
    """
    Adds a dose rate variable to the state variable, which is bound to the
    dosing regimen.
    """
    # Register a dose rate variable to the compartment and bind it to
    # pace, i.e. tell myokit that its value is set by the dosing regimen/
    # myokit.Protocol
    compartment = drug_amount.parent()
    dose_rate = compartment.add_variable_allow_renaming(str("dose_rate"))
    dose_rate.set_binding(_get_pacing_label(drug_amount))

    # Set initial value to 0 and unit to unit of drug amount over unit of
    # time
    dose_rate.set_rhs(0)
    drug_amount_unit = drug_amount.unit()
    if drug_amount_unit is not None and time_unit is not None:
        dose_rate.set_unit(drug_amount.unit() / time_unit)

    # Add the dose rate to the rhs of the drug amount variable
    rhs = drug_amount.rhs()
    drug_amount.set_rhs(myokit.Plus(rhs, myokit.Name(dose_rate)))


def _get_time_unit(model):
    """
    Gets the model's time unit.
    """
    # Get bound variables
    bound_variables = [var for var in model.variables(bound=True)]

    # Get the variable that is bound to time
    # (only one can exist in myokit.Model)
    for var in bound_variables:
        if var._binding == "time":
            return var.unit()


def _add_dose_compartment(model, drug_amount, time_unit):
    """
    Adds a dose compartment to the model with a linear absorption rate to
    the connected compartment.
    """
    # Add a dose compartment to the model
    dose_comp = model.add_component_allow_renaming("dose")

    # Create a state variable for the drug amount in the dose compartment
    dose_drug_amount = dose_comp.add_variable("drug_amount")
    dose_drug_amount.set_rhs(0)
    dose_drug_amount.set_unit(drug_amount.unit())
    dose_drug_amount.promote()

    # Create an absorption rate variable
    absorption_rate = dose_comp.add_variable("absorption_rate")
    absorption_rate.set_rhs(1)
    absorption_rate.set_unit(1 / time_unit)

    # Add outflow expression to dose compartment
    dose_drug_amount.set_rhs(
        myokit.Multiply(
            myokit.PrefixMinus(myokit.Name(absorption_rate)),
            myokit.Name(dose_drug_amount),
        )
    )

    # Add inflow expression to connected compartment
    rhs = drug_amount.rhs()
    drug_amount.set_rhs(
        myokit.Plus(
            rhs,
            myokit.Multiply(
                myokit.Name(absorption_rate), myokit.Name(dose_drug_amount)
            ),
        )
    )

    return dose_drug_amount


def _get_dosing_events(
    doses,
    amount_conversion_factor=1.0,
    time_conversion_factor=1.0,
    tlag_time=0.0,
    time_max=None,
):
    dosing_events = []
    for d in doses.all():
        if d.repeat_interval <= 0:
            continue
        start_times = np.arange(
            d.start_time + tlag_time,
            d.start_time + tlag_time + d.repeat_interval * d.repeats,
            d.repeat_interval,
        )
        if len(start_times) == 0:
            continue
        dose_level = d.amount / d.duration
        dosing_events += [
            (
                (amount_conversion_factor / time_conversion_factor) * dose_level,
                time_conversion_factor * start_time,
                time_conversion_factor * d.duration,
            )
            for start_time in start_times
        ]
    # if any dosing events are close to time_max,
    # make them equal to time_max
    if time_max is not None:
        for i, (level, start, duration) in enumerate(dosing_events):
            if abs(start - time_max) < 1e-6:
                dosing_events[i] = (level, time_max, duration)
            elif abs(start + duration - time_max) < 1e-6:
                dosing_events[i] = (level, start, time_max - start)
    return dosing_events
