#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import pkpdapp
import numpy as np
from myokit.formats.mathml import MathMLExpressionWriter
from myokit.formats.sbml import SBMLParser
import myokit
import threading
from django.core.cache import cache
import logging

logger = logging.getLogger(__name__)

lock = threading.Lock()


class MyokitModelMixin:
    def _get_myokit_model_cache_key(self):
        return "myokit_model_{}_{}".format(self._meta.db_table, self.id)

    def _get_myokit_simulator_cache_key(self):
        return "myokit_simulator_{}_{}".format(self._meta.db_table, self.id)

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

    def create_myokit_simulator(self, override_tlag=None, model=None, time_max=None):
        if override_tlag is None:
            override_tlag = {}

        if model is None:
            model = self.get_myokit_model()

        from pkpdapp.models import Variable

        if override_tlag is None:
            try:
                tlag_value = self.variables.get(
                    qname="PKCompartment.tlag"
                ).default_value
            except Variable.DoesNotExist:
                tlag_value = 0.0
        else:
            tlag_value = override_tlag

        # add a dose_rate variable to the model for each
        # dosed variable
        for v in self.variables.filter(state=True):
            if v.protocol:
                myokit_v = model.get(v.qname)
                set_administration(model, myokit_v)

        protocols = {}
        project = self.get_project()
        if project is None:
            compound = None
        else:
            compound = project.compound
        for v in self.variables.filter(state=True):
            if v.protocol:
                # get tlag value default to 0
                derived_param = v.qname + "_tlag_ud"
                try:
                    tlag_value = self.variables.get(qname=derived_param).default_value
                except Variable.DoesNotExist:
                    tlag_value = 0.0

                # override tlag if set
                if v.qname in override_tlag:
                    tlag_value = override_tlag[v.qname]

                amount_var = model.get(v.qname)
                time_var = model.binding("time")

                is_target = False
                if self.is_library_model:
                    is_target = "CT1" in v.qname or "AT1" in v.qname

                amount_conversion_factor = v.protocol.amount_unit.convert_to(
                    amount_var.unit(), compound=compound, is_target=is_target
                )

                time_conversion_factor = v.protocol.time_unit.convert_to(
                    time_var.unit(), compound=compound
                )

                dosing_events = []
                last_dose_time = tlag_value
                for d in v.protocol.doses.all():
                    if d.repeat_interval <= 0:
                        continue
                    start_times = np.arange(
                        d.start_time + last_dose_time,
                        d.start_time + last_dose_time + d.repeat_interval * d.repeats,
                        d.repeat_interval,
                    )
                    if len(start_times) == 0:
                        continue
                    last_dose_time = start_times[-1]
                    dosing_events += [
                        (
                            (amount_conversion_factor / time_conversion_factor)
                            * (d.amount / d.duration),
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
                protocols[_get_pacing_label(amount_var)] = get_protocol(dosing_events)

        with lock:
            sim = myokit.Simulation(model, protocol=protocols)
        return sim

    def get_myokit_simulator(self):
        key = self._get_myokit_simulator_cache_key()
        with lock:
            myokit_simulator = cache.get(key)
        if myokit_simulator is None:
            myokit_simulator = self.create_myokit_simulator()
            cache.set(key, myokit_simulator, timeout=None)
        return myokit_simulator

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

        # just check if the number of const variables is right
        # TODO: is this sufficient, we are also updating on save
        # so I think it should be ok....?
        all_const_variables = self.variables.filter(constant=True)
        myokit_variable_count = sum(1 for _ in model.variables(const=True, sort=True))
        # check if variables need updating
        return len(all_const_variables) != myokit_variable_count

    def update_simulator(self):
        # delete simulator from cache
        cache.delete(self._get_myokit_simulator_cache_key())

    def update_model(self):
        logger.info("UPDATE MODEL")
        # delete model and simulators from cache
        cache.delete(self._get_myokit_simulator_cache_key())
        cache.delete(self._get_myokit_model_cache_key())

        # update the variables of the model
        from pkpdapp.models import Variable

        removed_variables = []
        if self.is_library_model:
            removed_variables += [
                "PKCompartment.b_term",
                "PKCompartment.c_term",
            ]
            if not getattr(self, "has_saturation", True):
                removed_variables += ["PKCompartment.Km", "PKCompartment.CLmax"]
            if not getattr(self, "has_effect", True):
                removed_variables += [
                    "PKCompartment.Ce",
                    "PKCompartment.AUCe",
                    "PKCompartment.ke0",
                    "PKCompartment.Kpu",
                    "PKCompartment.Kp",
                ]
            if not getattr(self, "has_hill_coefficient", True):
                removed_variables += ["PDCompartment.HC"]
            # tlag now on per variable basis
            removed_variables += ["PKCompartment.tlag"]
            if not getattr(self, "has_bioavailability", True):
                removed_variables += ["PKCompartment.F"]

        model = self.get_myokit_model()
        new_variables = [
            Variable.get_variable(self, v)
            for v in model.variables(const=True, sort=True)
            if v.is_literal() and v.qname() not in removed_variables
        ]

        # parameters could originally be outputs
        for v in new_variables:
            if not v.constant:
                v.constant = True
                v.save()
        new_states = [
            Variable.get_variable(self, v)
            for v in model.variables(state=True, sort=True)
            if v.qname() not in removed_variables
        ]
        new_outputs = [
            Variable.get_variable(self, v)
            for v in model.variables(const=False, state=False, sort=True)
            if v.qname() not in removed_variables
        ]
        logger.debug("ALL NEW OUTPUTS")
        for v in new_outputs:
            if v.unit is not None:
                logger.debug(
                    f"{v.qname} [{v.unit.symbol}], "
                    f"id = {v.id} constant = {v.constant}, "
                    f"state = {v.state}"
                )
            else:
                logger.debug(
                    f"{v.qname}, id = {v.id} "
                    f"constant = {v.constant}, "
                    f"state = {v.state}"
                )

        for v in new_outputs:
            # if output not in states set state false
            # so only states with initial conditions as
            # parameters will have state set to true
            if v not in new_states and v.state is True:
                v.state = False
                v.save()

            # parameters could originally be variables
            if v.constant:
                v.constant = False
                v.save()

        all_new_variables = new_variables + new_states + new_outputs
        logger.debug("ALL NEW VARIABLES")
        for v in all_new_variables:
            if v.unit is not None:
                logger.debug(
                    f"{v.qname} [{v.unit.symbol}], id = {v.id} "
                    f"constant = {v.constant}, state = {v.state}"
                )
            else:
                logger.debug(
                    f"{v.qname}, id = {v.id} "
                    f"constant = {v.constant}, state = {v.state}"
                )

        # for library models: set new variables to defaults
        if self.is_library_model and hasattr(self, "reset_params_to_defaults"):
            project = self.get_project()
            if project is not None:
                species = project.species
                compound_type = project.compound.compound_type
                self.reset_params_to_defaults(species, compound_type, all_new_variables)

        # delete all variables that are not in new
        for variable in self.variables.all():
            if variable not in all_new_variables:
                logger.debug(f"DELETING VARIABLE {variable.qname} (id = {variable.id})")
                variable.delete()
            else:
                logger.debug(
                    f"RETAINING VARIABLE {variable.qname} (id = {variable.id}, value = {variable.default_value})"  # noqa: E501
                )

        self.variables.set(all_new_variables)

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

    def states(self):
        """states are dependent variables of the model to be solved"""
        model = self.get_myokit_model()
        states = model.variables(state=True, sort=True)
        return [self._serialise_variable(s) for s in states]

    def components(self):
        """
        outputs are dependent (e.g. y) and independent (e.g. time)
        variables of the model to be solved
        """
        model = self.get_myokit_model()
        return [self._serialise_component(c) for c in model.components(sort=True)]

    def outputs(self):
        """
        outputs are dependent (e.g. y) and independent (e.g. time)
        variables of the model to be solved
        """
        model = self.get_myokit_model()
        outpts = model.variables(const=False, sort=True)
        return [self._serialise_variable(o) for o in outpts]

    def myokit_variables(self):
        """
        variables are independent variables of the model that are constant
        over time. aka parameters of the model
        """
        model = self.get_myokit_model()
        variables = model.variables(const=True, sort=True)
        return [self._serialise_variable(v) for v in variables]

    def _convert_unit(self, variable, myokit_variable_sbml, value):
        is_target = False
        if self.is_library_model:
            is_target = "CT1" in variable.qname or "AT1" in variable.qname
        if variable.unit is None:
            conversion_factor = 1.0
        else:
            project = self.get_project()
            compound = None
            if project is not None:
                compound = project.compound
            conversion_factor = variable.unit.convert_to(
                myokit_variable_sbml.unit(), compound=compound, is_target=is_target
            )

        return conversion_factor * value

    def _convert_unit_qname(self, qname, value, myokit_model):
        variable = self.variables.get(qname=qname)
        myokit_variable_sbml = myokit_model.get(qname)
        new_value = self._convert_unit(variable, myokit_variable_sbml, value)
        return new_value

    def _convert_bound_unit(self, binding, value, myokit_model):
        myokit_variable_sbml = myokit_model.binding(binding)
        variable = self.variables.get(qname=myokit_variable_sbml.qname())
        return self._convert_unit(variable, myokit_variable_sbml, value)

    def serialize_datalog(self, datalog, myokit_model):
        result = {}
        for k, v in datalog.items():
            variable = self.variables.get(qname=k)
            myokit_variable_sbml = myokit_model.get(k)

            if variable.unit is None:
                conversion_factor = 1.0
            else:
                conversion_factor = myokit.Unit.conversion_factor(
                    myokit_variable_sbml.unit(), variable.unit.get_myokit_unit()
                ).value()

            result[variable.id] = (conversion_factor * np.frombuffer(v)).tolist()

        return result

    def get_time_max(self):
        return self.time_max

    def simulate(self, outputs=None, variables=None, time_max=None):
        """
        Arguments
        ---------
        outputs: list
            list of output names to return
        variables: dict
            dict mapping variable names to values for model parameters
        time_max: float
            maximum time to simulate to

        Returns
        -------
        output: myokit.DataLog
            a DataLog containing the solution, which is effectivly a dict
            mapping output names to arrays of values
        """

        if time_max is None:
            time_max = self.get_time_max()

        if outputs is None:
            outputs = []

        default_variables = {
            v.qname: v.get_default_value() for v in self.variables.filter(constant=True)
        }
        if variables is None:
            variables = default_variables
        else:
            variables = {
                **default_variables,
                **variables,
            }

        model = self.get_myokit_model()

        # Convert units
        variables = {
            qname: self._convert_unit_qname(qname, value, model)
            for qname, value in variables.items()
        }
        time_max = self._convert_bound_unit("time", time_max, model)

        # Set constants in model
        for var_name, var_value in variables.items():
            model.get(var_name).set_rhs(float(var_value))

        # create simulator

        # get tlag vars
        override_tlag = {}
        if isinstance(self, pkpdapp.models.CombinedModel):
            for dv in self.derived_variables.all():
                if dv.type == "TLG":
                    derived_param = dv.pk_variable.qname + "_tlag_ud"
                    if derived_param in variables:
                        override_tlag[dv.pk_variable.qname] = variables[derived_param]

        sim = self.create_myokit_simulator(
            override_tlag=override_tlag, model=model, time_max=time_max
        )
        # TODO: take these from simulation model
        sim.set_tolerance(abs_tol=1e-06, rel_tol=1e-08)

        # Simulate, logging only state variables given by `outputs`
        return self.serialize_datalog(sim.run(time_max, log=outputs), model)


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
    return f'pace_{variable.qname().replace(".", "_")}'


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
