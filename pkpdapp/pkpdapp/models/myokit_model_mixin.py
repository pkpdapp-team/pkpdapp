#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import threading
from django.core.cache import cache
import myokit
from myokit.formats.sbml import SBMLParser
from myokit.formats.mathml import MathMLExpressionWriter
import numpy as np

lock = threading.Lock()


class MyokitModelMixin:
    def _get_myokit_model_cache_key(self):
        return 'myokit_model_{}_{}'.format(
            self._meta.db_table, self.id
        )

    def _get_myokit_simulator_cache_key(self):
        return 'myokit_simulator_{}_{}'.format(
            self._meta.db_table, self.id
        )

    @staticmethod
    def parse_sbml_string(sbml):
        with lock:
            model = SBMLParser().parse_string(
                str.encode(sbml)
            ).myokit_model()
        return model

    def create_myokit_model(self):
        return self.parse_sbml_string(self.sbml)

    def create_myokit_simulator(self):
        model = self.get_myokit_model()
        with lock:
            sim = myokit.Simulation(model)
        return sim

    def get_myokit_simulator(self):
        key = self._get_myokit_simulator_cache_key()
        with lock:
            myokit_simulator = cache.get(key)
        if myokit_simulator is None:
            myokit_simulator = self.create_myokit_simulator()
            cache.set(
                key, myokit_simulator, timeout=None
            )
        return myokit_simulator

    def get_myokit_model(self):
        key = self._get_myokit_model_cache_key()
        with lock:
            myokit_model = cache.get(key)
        if myokit_model is None:
            myokit_model = self.create_myokit_model()
            cache.set(
                key, myokit_model, timeout=None
            )
        return myokit_model

    def is_variables_out_of_date(self):
        model = self.get_myokit_model()

        # just check if the number of const variables is right
        # TODO: is this sufficient, we are also updating on save
        # so I think it should be ok....?
        all_const_variables = self.variables.filter(constant=True)
        myokit_variable_count = sum(
            1 for _ in model.variables(const=True, sort=True)
        )
        # check if variables need updating
        return len(all_const_variables) != myokit_variable_count

    def update_simulator(self):
        # delete simulator from cache
        cache.delete(self._get_myokit_simulator_cache_key())

    def update_model(self):
        print('UPDATE MODEL')
        # delete model and simulators from cache
        cache.delete(self._get_myokit_simulator_cache_key())
        cache.delete(self._get_myokit_model_cache_key())

        # update the variables of the model
        from pkpdapp.models import Variable
        new_variables = [
            Variable.get_variable(self, v)
            for v in self.get_myokit_model().variables(const=True, sort=True)
        ]
        new_states = [
            Variable.get_variable(self, v)
            for v in self.get_myokit_model().variables(state=True, sort=True)
        ]
        new_outputs = [
            Variable.get_variable(self, v)
            for v in self.get_myokit_model().variables(const=False, sort=True)
        ]
        all_new_variables = new_variables + new_states + new_outputs

        # delete all variables that are not in new
        for variable in self.variables.all():
            if variable not in all_new_variables:
                print('DELETING VARIABLE', variable.qname)
                variable.delete()

        self.variables.set(all_new_variables)

    @staticmethod
    def _serialise_equation(equ):
        writer = MathMLExpressionWriter()
        writer.set_mode(presentation=True)
        return writer.eq(equ)

    @staticmethod
    def _serialise_variable(var):
        return {
            'name': var.name(),
            'qname': var.qname(),
            'unit': str(var.unit()),
            'default_value': float(var.value()),
            'lower_bound': 0.0,
            'upper_bound': 2.0,
            'scale': 'LN',
        }

    @classmethod
    def _serialise_component(cls, c):
        states = [
            cls._serialise_variable(s)
            for s in c.variables(state=True, sort=True)
        ]
        variables = [
            cls._serialise_variable(v)
            for v in c.variables(const=True, sort=True)
        ]
        outputs = [
            cls._serialise_variable(o)
            for o in c.variables(const=False, sort=True)
        ]
        equations = [
            cls._serialise_equation(e)
            for e in c.equations(bound=False, const=False)
        ]
        return {
            'name': c.name(),
            'states': states,
            'variables': variables,
            'outputs': outputs,
            'equations': equations,
        }

    def states(self):
        """ states are dependent variables of the model to be solved """
        model = self.get_myokit_model()
        states = model.variables(state=True, sort=True)
        return [
            self._serialise_variable(s) for s in states
        ]

    def components(self):
        """
        outputs are dependent (e.g. y) and independent (e.g. time)
        variables of the model to be solved
        """
        model = self.get_myokit_model()
        return [
            self._serialise_component(c)
            for c in model.components(sort=True)
        ]

    def outputs(self):
        """
        outputs are dependent (e.g. y) and independent (e.g. time)
        variables of the model to be solved
        """
        model = self.get_myokit_model()
        outpts = model.variables(const=False, sort=True)
        return [
            self._serialise_variable(o) for o in outpts
        ]

    def myokit_variables(self):
        """
        variables are independent variables of the model that are constant
        over time. aka parameters of the model
        """
        model = self.get_myokit_model()
        variables = model.variables(const=True, sort=True)
        return [
            self._serialise_variable(v) for v in variables
        ]

    def _convert_unit(self, qname, value, myokit_model):
        variable = self.variables.get(qname=qname)
        myokit_variable_sbml = myokit_model.get(qname)

        conversion_factor = myokit.Unit.conversion_factor(
            variable.unit.get_myokit_unit(),
            myokit_variable_sbml.unit()
        ).value()

        return conversion_factor * value

    def serialize_datalog(self, datalog, myokit_model):
        result = {}
        for k, v in datalog.items():
            variable = self.variables.get(qname=k)
            myokit_variable_sbml = myokit_model.get(k)

            conversion_factor = myokit.Unit.conversion_factor(
                myokit_variable_sbml.unit(),
                variable.unit.get_myokit_unit()
            ).value()
            result[variable.id] = (
                conversion_factor * np.frombuffer(v)
            ).tolist()

        return result

    def get_time_max(self):
        return self.time_max

    def simulate(self, outputs=None, initial_conditions=None, variables=None):
        """
        Arguments
        ---------
        outputs: list
            list of output names to return
        initial_conditions: dict
            dict mapping state names to values for initial conditions
        variables: dict
            dict mapping variable names to values for model parameters

        Returns
        -------
        output: myokit.DataLog
            a DataLog containing the solution, which is effectivly a dict
            mapping output names to arrays of values
        """

        if outputs is None:
            outputs = [
                o.qname
                for o in self.variables.filter(constant=False)
            ]
        if initial_conditions is None:
            initial_conditions = {
                s.qname: s.get_default_value()
                for s in self.variables.filter(state=True)
            }
        if variables is None:
            variables = {
                v.qname: v.get_default_value()
                for v in self.variables.filter(constant=True)
            }

        model = self.get_myokit_model()
        sim = self.get_myokit_simulator()

        # convert units for variables, initial_conditions
        # and time_max
        initial_conditions = {
            qname: self._convert_unit(qname, value, model)
            for qname, value in initial_conditions.items()
        }

        variables = {
            qname: self._convert_unit(qname, value, model)
            for qname, value in variables.items()
        }

        time_max = self._convert_unit(
            'myokit.time', self.get_time_max(), model
        )

        # Set initial conditions
        try:
            sim.set_default_state(initial_conditions)
        except ValueError:
            print('WARNING: in simulate: '
                  'sim.set_default_state returned ValueError')
            return {}

        # Set constants in model
        for var_name, var_value in variables.items():
            sim.set_constant(var_name, float(var_value))

        # Reset simulation back to t=0, the state will be set to the default
        # state (set above)
        sim.reset()

        # Simulate, logging only state variables given by `outputs`
        return self.serialize_datalog(
            sim.run(time_max, log=outputs), model
        )
