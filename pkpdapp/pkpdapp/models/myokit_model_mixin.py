#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import hashlib
import os
from tempfile import TemporaryDirectory
import tempfile

import pkpdapp
import numpy as np
from myokit.formats.mathml import MathMLExpressionWriter
from myokit.formats.sbml import SBMLParser
from myokit.formats.diffsl import DiffSLExporter
import myokit
import threading
from django.core.cache import cache
import logging
import pints

from pkpdapp.models import Biomarker, BiomarkerType, SubjectGroup

logger = logging.getLogger(__name__)

lock = threading.Lock()

USE_DIFFSOL = True
if USE_DIFFSOL:
    import pydiffsol


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

    def _initialise_diffsol_inputs(self, model, variables):
        # Convert units
        inputs = {
            qname: self._convert_unit_qname(qname, value, model)
            for qname, value in variables.items()
        }

        return inputs

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

            target = self._unit_conversion_target(qname)

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

    def _get_myokit_simulator_cache_key(self, hash=None):
        return "myokit_simulator_{}_{}_{}".format(self._meta.db_table, self.id, hash)

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

    def get_diffsol_ode(
        self,
        override_tlag,
        model,
        time_max,
        dosing_protocols,
        outputs,
        inputs,
    ):
        protocols = self._get_myokit_protocols(
            model=model,
            dosing_protocols=dosing_protocols,
            override_tlag=override_tlag,
            time_max=time_max,
        )

        inputs_myokit = [model.get(qname) for qname in inputs]
        outputs_myokit = [model.get(qname) for qname in outputs]

        temp = tempfile.NamedTemporaryFile(delete=False)
        try:
            path = temp.name
            temp.close()  # important so other code can open it
            DiffSLExporter().model(
                path,
                model,
                convert_units=False,
                protocol=protocols,
                inputs=inputs_myokit,
                outputs=outputs_myokit,
                final_time=time_max,
            )
            with open(path, "r") as f:
                content = f.read()
        finally:
            os.remove(path)  # cleanup

        key = self._get_myokit_simulator_cache_key(
            hash=hashlib.sha256(content.encode()).hexdigest()
        )
        ode = cache.get(key)
        if ode is None:
            ode = pydiffsol.Ode(content)
            cache.set(key, ode, timeout=None)
        return ode

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

    def serialize_diffsol_solution(self, soln, myokit_model, outputs):
        result = {}
        for i in range(len(outputs)):
            y = soln.ys[i, :]
            output_qname = outputs[i]
            variable = self.variables.get(qname=output_qname)
            myokit_variable_sbml = myokit_model.get(output_qname)

            if variable.unit is None:
                conversion_factor = 1.0
            else:
                conversion_factor = self._conversion_factor(
                    variable, myokit_variable_sbml
                )

            result[variable.id] = (y / conversion_factor).tolist()

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
            myokit_var = model.get("PKNonlinearities.C_Drug")
            # set C_Drug equal to the sum of the first dose amounts for all protocols
            # within this group
            # TODO: later we will get users to select which variable to use for the
            # dose concentration via the nonlinearities UI interface.
            dose_sum = 0.0
            for protocol in dosing_protocols.values():
                amount_conversion_factor = self._get_protocol_amount_conversion_factor(
                    project, protocol, myokit_var, project.compound, target=None
                )
                dose_sum += protocol.doses.first().amount * amount_conversion_factor

            # C_Drug cannot be zero as it might be raised to a negative power
            dose_sum = max(dose_sum, 1e-6)
            myokit_var.set_rhs(dose_sum)

    def _nonlinarities_inputs_diffsol(self, model, dosing_protocols):
        # For nonlinearities, add PKNonlinearities.C_Drug to variables with the
        # value of the first dose concentration
        if (
            self.is_library_model
            and model.has_variable("PKNonlinearities.C_Drug")
            and dosing_protocols is not None
            and len(dosing_protocols) > 0
        ):

            project = self.get_project()
            myokit_var = model.get("PKNonlinearities.C_Drug")
            # set C_Drug equal to the sum of the first dose amounts for all protocols
            # within this group
            # TODO: later we will get users to select which variable to use for the
            # dose concentration via the nonlinearities UI interface.
            dose_sum = 0.0
            for protocol in dosing_protocols.values():
                amount_conversion_factor = self._get_protocol_amount_conversion_factor(
                    project, protocol, myokit_var, project.compound, target=None
                )
                dose_sum += protocol.doses.first().amount * amount_conversion_factor

            # C_Drug cannot be zero as it might be raised to a negative power
            dose_sum = max(dose_sum, 1e-6)
            return {"PKNonlinearities.C_Drug": dose_sum}
        else:
            return {}

    def simulate_model_diffsol(
        self,
        outputs,
        variables,
        time_max,
        dosing_protocols,
    ):
        model = self.get_myokit_model()

        # Convert units
        inputs = self._initialise_diffsol_inputs(model, variables)
        time_max = self._convert_bound_unit("time", time_max, model)
        nonlinearities_inputs = self._nonlinarities_inputs_diffsol(
            model, dosing_protocols
        )
        input_names = []
        input_values = []
        for k, v in {**inputs, **nonlinearities_inputs}.items():
            input_names.append(k)
            input_values.append(v)

        # get tlag vars
        override_tlag = self._get_override_tlag(variables)

        ode = self.get_diffsol_ode(
            override_tlag=override_tlag,
            model=model,
            time_max=time_max,
            dosing_protocols=dosing_protocols,
            inputs=input_names,
            outputs=outputs,
        )
        soln = ode.solve(np.array(input_values), time_max)
        return self.serialize_diffsol_solution(soln, model, outputs)

    def simulate_model(
        self,
        outputs=None,
        variables=None,
        time_max=None,
        dosing_protocols=None,
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
        output: dict
            a dict with the following key, values:
                - "group_id": id of the subject group, None if no subject group
                - <variable id>: list of time-series values
            There is a <variable id> for all the requested outputs, including time
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

        groups = get_subject_groups(project)
        # sort groups starting alphabetically, but with those starting with Sim first
        groups = sorted(groups, key=lambda g: (not g.name.startswith("Sim"), g.name))

        for group in groups:
            dosing_protocols = {
                p.variable.qname: p for p in protocols if p.group == group
            }
            model_dosing_protocols.append(dosing_protocols)

        if USE_DIFFSOL:
            result = [
                self.simulate_model_diffsol(
                    variables=variables,
                    time_max=time_max,
                    outputs=outputs,
                    dosing_protocols=dosing_protocols,
                )
                for dosing_protocols in model_dosing_protocols
            ]
        else:
            result = [
                self.simulate_model(
                    variables=variables,
                    time_max=time_max,
                    outputs=outputs,
                    dosing_protocols=dosing_protocols,
                )
                for dosing_protocols in model_dosing_protocols
            ]

        # set group id for matching on plots
        result[0].update({"group_id": None})
        for r, group in zip(result[1:], groups):
            r.update({"group_id": group.id if group is not None else None})
        return result

    def optimise(
        self,
        inputs,
        starting,
        bounds,
        biomarker_types=None,
        subject_groups=None,
        max_iterations=None,
        use_multiplicative_noise=False,
    ):
        """
        Fits the model against the data indicated

        two different noise models are supported, gaussian additive (i.e. sum of squares)
        and log-normal multiplicative.

        The fitting is performed across all subject groups indicated, for each subject group:
            1. all the variable outputs mapped to the biomarker types are found, these will be
               the requested outputs for the simulation for that subject group
            2. the data is gathered from all the biomarkers for that subject group and those
               biomarker types, this is collected in a (a) list of time points and
               (b) 2D array where columns are timepoints and the rows arre outputs
               (same order as the requested outputs in 1.).
            3. a diffsol Ode model is contructed using the outputs from 1.

        Then the fitting is performed. The loss function for each iteration of the fitting has the
        following structure:
            - total loss initialised to zero
            - loop through each subject group:
                - a simulation is performed using the Ode model for that subject group, using
                  the solve_dense method on Ode, passing in the timepoints collected in 2. above
                - the loss function for that subject group is calculated and added to the total
                  loss

        The package Pints is used for the optimisation (https://pints.readthedocs.io/en/stable/optimisers/index.html).
        For the moment we just use the cmaes algorithm (https://github.com/pints-team/pints/blob/main/examples/optimisation/cmaes.ipynb).
        We use the starting point and bounds given in the args, and run the given maximum number of iterations.

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
            maximum number of iterations of the opimisation algorithm (default 500)
        use_multiplicative_noise: bool (optional)
            if False (default) use additive noise (sum of squares loss), if True,
            use multiplicative noise (log-normal noise)

        Returns
        -------
        result: dict
            - "optimal": (list) optimal input values (same order as inputs)
            - "loss": (float) value of loss function at optimal
            - "reason": (str) stopping reason
        """

        if not USE_DIFFSOL:
            raise RuntimeError("Optimisation requires diffsol support.")

        if max_iterations is None:
            max_iterations = 500

        input_variables, starting, lower_bounds, upper_bounds = (
            self._validate_optimise_inputs(inputs, starting, bounds)
        )
        groups = self._prepare_optimise_groups(biomarker_types, subject_groups)

        class OptimiseError(pints.ErrorMeasure):
            def n_parameters(inner_self):
                return len(input_variables)

            def __call__(inner_self, values):
                loss = self._optimise_loss(
                    groups,
                    input_variables,
                    values,
                    use_multiplicative_noise=use_multiplicative_noise,
                )
                if np.isfinite(loss) and loss < inner_self.best_loss:
                    inner_self.best_loss = float(loss)
                    inner_self.best_values = np.asarray(values, dtype=float).copy()
                return loss

        error = OptimiseError()
        error.best_loss = np.inf
        error.best_values = np.asarray(starting, dtype=float).copy()
        starting_loss = error(starting)
        if not np.isfinite(starting_loss):
            raise RuntimeError(
                "Initial optimisation loss is not finite. Check that the solver "
                "returns all requested dense output times and that data are valid."
            )

        optimiser_start = np.asarray(starting, dtype=float)
        default_start = np.asarray(
            [variable.get_default_value() for variable in input_variables],
            dtype=float,
        )
        if np.all(default_start >= lower_bounds) and np.all(
            default_start <= upper_bounds
        ):
            default_loss = error(default_start)
            if np.isfinite(default_loss) and default_loss < starting_loss:
                optimiser_start = default_start
                starting_loss = float(default_loss)

        boundaries = pints.RectangularBoundaries(lower_bounds, upper_bounds)
        optimiser = pints.OptimisationController(
            error,
            optimiser_start,
            boundaries=boundaries,
            method=pints.CMAES,
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

        return {
            "optimal": np.asarray(optimal, dtype=float).tolist(),
            "loss": float(loss),
            "reason": str(reason),
        }

    def _validate_optimise_inputs(self, inputs, starting, bounds):
        from pkpdapp.models import Variable

        if len(inputs) < 1:
            raise ValueError("Optimisation requires at least one input.")

        if len(set(inputs)) != len(inputs):
            raise ValueError("Optimisation inputs must be unique.")

        if len(starting) != len(inputs):
            raise ValueError("Starting values must have the same length as inputs.")

        if len(bounds) != 2:
            raise ValueError("Bounds must be a pair of lower and upper bound lists.")

        lower_bounds, upper_bounds = bounds
        if len(lower_bounds) != len(inputs) or len(upper_bounds) != len(inputs):
            raise ValueError("Bounds must have the same length as inputs.")

        variables_by_id = {
            variable.id: variable for variable in self.variables.filter(id__in=inputs)
        }
        missing = [input_id for input_id in inputs if input_id not in variables_by_id]
        if missing:
            raise Variable.DoesNotExist(
                f"Optimisation input variables do not exist: {missing}"
            )

        variables = [variables_by_id[input_id] for input_id in inputs]
        for variable in variables:
            if not variable.constant:
                raise ValueError(
                    f"Optimisation input {variable.qname} must be a constant variable."
                )
            if variable.qname.endswith("_tlag_ud"):
                raise ValueError(
                    "Optimising tlag variables is not supported by this method."
                )

        starting = np.asarray(starting, dtype=float)
        lower_bounds = np.asarray(lower_bounds, dtype=float)
        upper_bounds = np.asarray(upper_bounds, dtype=float)

        if not (
            np.all(np.isfinite(starting))
            and np.all(np.isfinite(lower_bounds))
            and np.all(np.isfinite(upper_bounds))
        ):
            raise ValueError("Starting values and bounds must be finite.")

        if np.any(lower_bounds >= upper_bounds):
            raise ValueError("Every lower bound must be less than its upper bound.")

        if np.any(starting < lower_bounds) or np.any(starting > upper_bounds):
            raise ValueError("Starting values must lie within the supplied bounds.")

        return variables, starting, lower_bounds, upper_bounds

    def _prepare_optimise_groups(self, biomarker_types, subject_groups):

        project = self.get_project()
        if project is None:
            raise ValueError("Optimisation requires the model to belong to a project.")

        model_variable_qnames = set(self.variables.values_list("qname", flat=True))
        biomarker_type_qs = BiomarkerType.objects.filter(dataset__project=project)

        if biomarker_types is None:
            biomarker_type_qs = biomarker_type_qs.filter(variable__isnull=False)
        else:
            biomarker_type_qs = biomarker_type_qs.filter(id__in=biomarker_types)
            found_ids = set(biomarker_type_qs.values_list("id", flat=True))
            missing_ids = set(biomarker_types) - found_ids
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

        biomarkers = Biomarker.objects.filter(
            biomarker_type__in=biomarker_type_list,
            subject__dataset__project=project,
        ).select_related(
            "biomarker_type",
            "biomarker_type__variable",
            "biomarker_type__stored_unit",
            "biomarker_type__stored_time_unit",
            "subject",
            "subject__group",
        )

        if subject_groups is not None:
            found_group_ids = set(
                SubjectGroup.objects.filter(
                    id__in=subject_groups,
                ).values_list("id", flat=True)
            )
            missing_group_ids = set(subject_groups) - found_group_ids
            if missing_group_ids:
                raise SubjectGroup.DoesNotExist(
                    f"Subject groups do not exist: {missing_group_ids}"
                )
            biomarkers = biomarkers.filter(subject__group_id__in=subject_groups)

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
                group = None
            else:
                group_biomarkers = biomarkers.filter(subject__group_id=group_id)
                group = group_biomarkers[0].subject.group
            groups.append(self._prepare_optimise_group(group, group_biomarkers))

        return groups

    def _prepare_optimise_group(self, group, biomarkers):
        project = self.get_project()
        model = self.create_myokit_model()
        time_var = model.binding("time")

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

            myokit_variable = model.get(qname)
            target = self._unit_conversion_target(qname)
            compound = project.compound if project is not None else None
            value_conversion_factor = biomarker_type.stored_unit.convert_to(
                myokit_variable.unit(),
                compound=compound,
                target=target,
            )
            time_conversion_factor = biomarker_type.stored_time_unit.convert_to(
                time_var.unit(),
                compound=compound,
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

        t_eval = np.asarray(sorted(set(times)), dtype=float)
        time_lookup = {time: i for i, time in enumerate(t_eval)}
        for record in records:
            record["time_index"] = time_lookup[record["time"]]

        protocols = project.protocols.all()
        if group is None:
            dosing_protocols = {
                p.variable.qname: p
                for p in protocols
                if p.group is None and p.variable is not None
            }
        else:
            dosing_protocols = {
                p.variable.qname: p
                for p in protocols
                if p.group == group and p.variable is not None
            }

        default_variables = {
            v.qname: v.get_default_value()
            for v in self.variables.filter(constant=True).order_by("id")
        }
        inputs = self._initialise_diffsol_inputs(model, default_variables)
        inputs.update(self._nonlinarities_inputs_diffsol(model, dosing_protocols))

        input_names = list(inputs.keys())
        input_values = np.asarray([inputs[name] for name in input_names], dtype=float)
        input_indices = {name: i for i, name in enumerate(input_names)}
        missing_inputs = [
            qname
            for qname in self.variables.filter(constant=True)
            .order_by("id")
            .values_list("qname", flat=True)
            if qname not in input_indices
        ]
        if missing_inputs:
            raise ValueError(
                f"Optimisation inputs are missing from DiffSL inputs: {missing_inputs}"
            )

        ode = self.get_diffsol_ode(
            override_tlag={},
            model=model,
            time_max=t_eval[-1],
            dosing_protocols=dosing_protocols,
            inputs=input_names,
            outputs=output_qnames,
        )

        return {
            "model": model,
            "ode": ode,
            "input_names": input_names,
            "input_values": input_values,
            "input_indices": input_indices,
            "outputs": output_qnames,
            "t_eval": t_eval,
            "records": records,
        }

    def _optimise_loss(
        self,
        groups,
        input_variables,
        values,
        use_multiplicative_noise=False,
    ):
        values = np.asarray(values, dtype=float)
        if not np.all(np.isfinite(values)):
            return np.inf

        total = 0.0
        for group in groups:
            try:
                y = self._optimise_predict(group, input_variables, values)
            except exception:
                logger.exception("diffsol solve failed during optimisation.")
                return np.inf

            for record in group["records"]:
                prediction = y[record["output_index"], record["time_index"]]
                observed = record["value"]
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

    def _optimise_predict(self, group, input_variables, values):
        values = np.asarray(values, dtype=float)
        if not np.all(np.isfinite(values)):
            raise ValueError("optimisation values must be finite.")

        input_values = np.array(group["input_values"], copy=True)
        for value, variable in zip(values, input_variables):
            input_values[group["input_indices"][variable.qname]] = (
                self._convert_unit_qname(variable.qname, value, group["model"])
            )

        solution = group["ode"].solve_dense(input_values, group["t_eval"])
        y = solution.ys

        if y.shape != (len(group["outputs"]), len(group["t_eval"])):
            raise ValueError(
                "Unexpected prediction shape: "
                f"{y.shape}, expected {(len(group['outputs']), len(group['t_eval']))}."
            )

        return y

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
