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
    def _initialise_variables(self, model, variables):
        # Convert units
        variables = {
            qname: self._convert_unit_qname(qname, value, model)
            for qname, value in variables.items()
        }

        # Set constants in model
        for var_name, var_value in variables.items():
            model.get(var_name).set_rhs(float(var_value))

        return variables

    @staticmethod
    def _get_protocol_amount_conversion_factor(
        project, protocol, amount_var, compound, target
    ):
        # if the amount unit is in per kg, use species weight to convert
        # to per animal
        additional_conversion_factor = 1.0
        if (
            project is not None
            and project.version > 2
            and protocol.amount_per_body_weight
        ):
            additional_conversion_factor = project.species_weight

        amount_conversion_factor = (
            protocol.amount_unit.convert_to(
                amount_var.unit(), compound=compound, target=target
            )
            * additional_conversion_factor
        )
        return amount_conversion_factor

    def _get_myokit_protocols(self, model, dosing_protocols, override_tlag, time_max):
        protocols = {}
        time_var = model.binding("time")
        project = self.get_project()
        if project is None:
            compound = None
        else:
            compound = project.compound

        for qname, protocol in dosing_protocols.items():
            amount_var = model.get(qname)
            set_administration(model, amount_var)
            tlag_value = self._get_tlag_value(qname)
            # override tlag if set
            if qname in override_tlag:
                tlag_value = override_tlag[qname]

            target = None
            if self.is_library_model:
                if "CT1" in qname or "AT1" in qname:
                    target = 1
                elif "CT2" in qname or "AT2" in qname:
                    target = 2

            amount_conversion_factor = self._get_protocol_amount_conversion_factor(
                project, protocol, amount_var, compound, target
            )

            time_conversion_factor = protocol.time_unit.convert_to(
                time_var.unit(), compound=compound
            )

            dosing_events = _get_dosing_events(
                protocol.doses,
                amount_conversion_factor,
                time_conversion_factor,
                tlag_value,
                time_max,
            )
            protocols[_get_pacing_label(amount_var)] = get_protocol(dosing_events)
        return protocols

    def _get_override_tlag(self, variables):
        override_tlag = {}
        if isinstance(self, pkpdapp.models.CombinedModel):
            for dv in self.derived_variables.all():
                if dv.type == "TLG":
                    derived_param = dv.pk_variable.qname + "_tlag_ud"
                    if derived_param in variables:
                        override_tlag[dv.pk_variable.qname] = variables[derived_param]
        return override_tlag

    def _get_tlag_value(self, qname):
        from pkpdapp.models import Variable

        # get tlag value default to 0
        derived_param = qname + "_tlag_ud"
        try:
            return self.variables.get(qname=derived_param).default_value
        except Variable.DoesNotExist:
            return 0.0

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

    def create_myokit_simulator(
        self, override_tlag=None, model=None, time_max=None, dosing_protocols=None
    ):
        if override_tlag is None:
            override_tlag = {}

        if model is None:
            model = self.get_myokit_model()

        if dosing_protocols is None:
            # add a dose_rate variable to the model for each
            # dosed variable
            dosing_protocols = {}
            for v in self.variables.filter(state=True):
                for p in v.protocols.all():
                    dosing_protocols[v.qname] = p

        protocols = self._get_myokit_protocols(
            model=model,
            dosing_protocols=dosing_protocols,
            override_tlag=override_tlag,
            time_max=time_max,
        )

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
                "PKCompartment.RateAbs",
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
                    f"{v.qname}, id = {v.id} "
                    f"constant = {v.constant}, state = {v.state}"
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
                    f"{v.qname}, id = {v.id} "
                    f"constant = {v.constant}, state = {v.state}"
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

    def _conversion_factor(self, variable, myokit_variable_sbml):
        target = None
        if self.is_library_model:
            if "CT1" in variable.qname or "AT1" in variable.qname:
                target = 1
            elif "CT2" in variable.qname or "AT2" in variable.qname:
                target = 2
        if variable.unit is None:
            conversion_factor = 1.0
        else:
            project = self.get_project()
            compound = None
            if project is not None:
                compound = project.compound
            conversion_factor = variable.unit.convert_to(
                myokit_variable_sbml.unit(), compound=compound, target=target
            )
            if (
                project is not None
                and project.version > 2
                and variable.unit_per_body_weight
            ):
                conversion_factor *= project.species_weight
        return conversion_factor

    def _convert_unit(self, variable, myokit_variable_sbml, value):
        conversion_factor = self._conversion_factor(variable, myokit_variable_sbml)

        return conversion_factor * value

    def _convert_unit_qname(self, qname, value, myokit_model):
        try:
            variable = self.variables.get(qname=qname)
        except pkpdapp.models.Variable.DoesNotExist:
            raise ValueError(f"Variable with qname {qname} does not exist in model.")
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
                conversion_factor = self._conversion_factor(
                    variable, myokit_variable_sbml
                )

            result[variable.id] = (np.frombuffer(v) / conversion_factor).tolist()

        return result

    def get_time_max(self):
        return self.time_max

    def _handle_nonlinarities(self, model, dosing_protocols):
        # For nonlinearities, add PKNonlinearities.C_Drug to variables with the
        # value of the first dose concentration
        if (
            self.is_library_model
            and model.has_variable("PKNonlinearities.C_Drug")
            and dosing_protocols is not None
            and len(dosing_protocols) > 0
        ):

            project = self.get_project()
            protocol = list(dosing_protocols.values())[0]
            dose = protocol.doses.first()
            myokit_var = model.get("PKNonlinearities.C_Drug")
            amount_conversion_factor = self._get_protocol_amount_conversion_factor(
                project, protocol, myokit_var, protocol.compound, target=None
            )
            first_dose_value = dose.amount
            myokit_var.set_rhs(first_dose_value * amount_conversion_factor)

    def simulate_model(
        self, outputs=None, variables=None, time_max=None, dosing_protocols=None
    ):
        model = self.get_myokit_model()

        # Convert units
        variables = self._initialise_variables(model, variables)
        time_max = self._convert_bound_unit("time", time_max, model)
        self._handle_nonlinarities(model, dosing_protocols)

        # get tlag vars
        override_tlag = self._get_override_tlag(variables)
        # create simulator
        sim = self.create_myokit_simulator(
            override_tlag=override_tlag,
            model=model,
            time_max=time_max,
            dosing_protocols=dosing_protocols,
        )
        # TODO: take these from simulation model
        sim.set_tolerance(abs_tol=1e-08, rel_tol=1e-08)
        # Simulate, logging only state variables given by `outputs`
        datalog = sim.run(time_max, log=outputs)
        return self.serialize_datalog(datalog, model)

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

        # add a dose_rate variable to the model for each
        # dosed variable
        project = self.get_project()
        protocols = project.protocols.all()
        project_dosing_protocols = {
            p.variable.qname: p
            for p in protocols
            if p.group is None and p.variable is not None
        }
        model_dosing_protocols = [project_dosing_protocols]

        for group in get_subject_groups(project):
            dosing_protocols = {
                p.variable.qname: p for p in protocols if p.group == group
            }
            model_dosing_protocols.append(dosing_protocols)

        return [
            self.simulate_model(
                variables=variables,
                time_max=time_max,
                outputs=outputs,
                dosing_protocols=dosing_protocols,
            )
            for dosing_protocols in model_dosing_protocols
        ]


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


def get_subject_groups(project):
    if project is None:
        return []
    dataset = project.datasets.first()
    if dataset is None:
        return project.groups.all()
    return dataset.groups.all().union(project.groups.all()).order_by("id")
