#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from django.core.cache import cache
from django.core.exceptions import ValidationError
import myokit
from myokit.formats.sbml import SBMLParser
import threading

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
        # myokit_simulator = cache.get(key)
        myokit_simulator = None
        if myokit_simulator is None:
            myokit_simulator = self.create_myokit_simulator()
            cache.set(
                key, myokit_simulator, timeout=None
            )
        return myokit_simulator

    def get_myokit_model(self):
        key = self._get_myokit_model_cache_key()
        # myokit_model = cache.get(key)
        myokit_model = None
        if myokit_model is None:
            myokit_model = self.create_myokit_model()
            cache.set(
                key, myokit_model, timeout=None
            )
        return myokit_model

    def save(self, *args, **kwargs):
        cache.delete(self._get_cache_key())
        super().save(*args, **kwargs)

    @staticmethod
    def _serialise_variable(var):
        return {
            'name': var.qname(),
            'unit': str(var.unit()),
            'default_value': float(var.value()),
            'lower_bound': 0.0,
            'upper_bound': 2.0,
            'scale': 'LN',
        }

    def states(self):
        """ states are dependent variables of the model to be solved """
        model = self.get_myokit_model()
        states = model.variables(state=True, sort=True)
        return [
            self._serialise_variable(s) for s in states
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

    def variables(self):
        """
        variables are independent variables of the model that are constant
        over time. aka parameters of the model
        """
        model = self.get_myokit_model()
        variables = model.variables(const=True, sort=True)
        return [
            self._serialise_variable(v) for v in variables
        ]

    @staticmethod
    def serialize_datalog(datalog):
        return {k: v.tolist() for k, v in datalog.items()}

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
            outputs = [o['name'] for o in self.outputs()]
        if initial_conditions is None:
            initial_conditions = {
                s['name']: s['default_value']
                for s in self.states()
            }
        if variables is None:
            variables = {
                v['name']: v['default_value']
                for v in self.variables()
            }

        sim = self.get_myokit_simulator()

        # Set initial conditions
        sim.set_default_state(initial_conditions)

        # Set constants in model
        for var_name, var_value in variables.items():
            sim.set_constant(var_name, float(var_value))

        # Reset simulation back to t=0, the state will be set to the default
        # state (set above)
        sim.reset()

        # Simulate, logging only state variables given by `outputs`
        return self.serialize_datalog(
            sim.run(self.time_max, log=outputs)
        )


class MechanisticModel(models.Model, MyokitModelMixin):
    """
    A PK or PD model, represented using SBML
    """
    DEFAULT_SBML = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<sbml '
        'xmlns="http://www.sbml.org/sbml/level3/version2/core" '
        'level="3" version="2"'
        '>'
        '<model id="default">'
        '</model>'
        '</sbml>'
    )

    name = models.CharField(max_length=100, help_text='name of the model')
    description = models.TextField(
        help_text='short description of the model',
        blank=True, default=''
    )
    sbml = models.TextField(
        help_text='the model represented using SBML (see http://sbml.org)',
        default=DEFAULT_SBML,
    )
    time_max = models.FloatField(
        default=30,
        help_text=(
            'suggested maximum time to simulate for this model (in the time '
            'units specified by the sbml model)'
        )
    )

    class Meta:
        abstract = True

    def __str__(self):
        return str(self.name)

    def clean(self):
        try:
            print('XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX')
            self.create_myokit_model()
        except Exception as e:
            raise ValidationError({'sbml': str(e)})


