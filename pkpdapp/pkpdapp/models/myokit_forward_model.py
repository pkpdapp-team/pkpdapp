#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import pints
import numpy as np
from sys import float_info


class MyokitForwardModel():
    """
    Arguments:
        myokit_model -- a Myokit model.
        myokit_simulator -- a Myokit simulator.
        outputs -- a list of strings representing output names
        times -- a list of ndarrays representing times for each output
        representing state names in model
        fixed_parameter_dict(=None by default) -- a dictionary
        representing key-value pairs for fixed parameters
    """

    def __init__(
        self, myokit_simulator, myokit_model,
        outputs, times,
        fixed_parameter_dict=None
    ):
        model = myokit_model
        self._sim = myokit_simulator
        self._sim.set_tolerance(abs_tol=1e-11, rel_tol=1e-9)

        # get all model states that will be used for inference
        self._n_states = model.count_states()

        # get initial conditions
        self._output_names = sorted(
            [var.qname() for var in model.variables(const=False)]
        )

        self._times = [np.array(t) for t in times]
        self._times_all = np.sort(list(set(np.concatenate(self._times))))

        self._output_indices = [
            np.searchsorted(self._times_all, t)
            for t in self._times
        ]

        self._state_names = sorted(
            [var.qname() for var in model.states()]
        )

        outputs_not_in_model = (
            [v not in self._output_names for v in outputs]
        )
        if any(outputs_not_in_model):
            raise ValueError('All outputs must be within model.')
        self._output_names = outputs
        self._n_outputs = len(outputs)

        # find fixed and variable parameters
        self._const_names = sorted(
            [var.qname() for var in model.variables(const=True)]
        )

        # parameters are all const variables plus the number of states
        # (for initial conditions)
        self._all_parameter_names = self._state_names + self._const_names
        self._n_all_parameters = len(self._all_parameter_names)

        if fixed_parameter_dict is None:
            self._fixed_parameter_dict = None
            self._fixed_parameter_names = None
            self._fixed_parameter_indices = None
            self._variable_parameter_names = self._all_parameter_names
            self._n_parameters = len(self._variable_parameter_names)
        else:
            if self._n_all_parameters < len(fixed_parameter_dict):
                raise ValueError(
                    'Number of fixed parameters must be fewer'
                    'than total number of model parameters.'
                )
            fparams_not_in_model_params = [p not in self._all_parameter_names
                                           for p
                                           in fixed_parameter_dict.keys()]
            if any(fparams_not_in_model_params):
                raise ValueError(
                    'All fixed parameter keys must correspond '
                    'with model keys.'
                )
            self._fixed_parameter_dict = fixed_parameter_dict
            self._fixed_parameter_names = list(fixed_parameter_dict.keys())
            self._variable_parameter_names = [
                x for x in self._all_parameter_names
                if x not in self._fixed_parameter_names
            ]
            self._n_parameters = len(self._variable_parameter_names)
            self._fixed_parameter_indices = [
                self._all_parameter_names.index(v)
                for v in self._fixed_parameter_names
            ]

        self._variable_parameter_indices = [
            self._all_parameter_names.index(v)
            for v in self._variable_parameter_names
        ]

    def n_outputs(self):
        """
        Returns the number of output dimensions.
        By default this is the number of states.
        """
        return self._n_outputs

    def n_parameters(self):
        """
        Returns the number of parameters in the model.
        Parameters of the model are initial state values and structural
        parameter values.
        """
        return self._n_parameters

    def _set_const(self, parameters):
        """
        Sets values of constant model parameters.
        """
        for id_var, var in enumerate(self._const_names):
            self._sim.set_constant(var, float(parameters[id_var]))

    def simulate(self, parameters):
        """
        Returns the numerical solution of the model outputs for specified
        parameters. Note, the parameter inputs should be ordered as
        in `variable_parameter_names()`.
        """

        if len(parameters) != self._n_parameters:
            raise ValueError('Number of parameters supplied must equal ' +
                             'number of non-fixed model parameters.')

        # ensure order of parameters works
        if self._fixed_parameter_dict is None:
            full_parameters = parameters
        else:
            full_parameters = [None] * self._n_all_parameters
            vals = list(self._fixed_parameter_dict.values())

            # fill up parameter vector with fixed and variable values
            for count, idx in enumerate(self._fixed_parameter_indices):
                full_parameters[idx] = vals[count]
            for count, idx in enumerate(self._variable_parameter_indices):
                full_parameters[idx] = parameters[count]

        # Reset simulation
        self._sim.reset()

        # Set initial conditions
        self._sim.set_state(full_parameters[:self._n_states])

        # Set constant model parameters
        self._set_const(full_parameters[self._n_states:])

        # Simulate: need +100*epsilon for times to ensure simulation
        # surpasses last time
        t_max = self._times_all[-1] + 1e2 * float_info.epsilon
        log_times = self._times_all
        output = self._sim.run(
            t_max,
            log=self._output_names, log_times=log_times
        )
        result = [
            np.array(output[name])[indices]
            for name, indices in zip(self._output_names, self._output_indices)
        ]

        return result

    def output_names(self):
        """ Returns outputs of model. """
        return self._output_names

    def output_shapes(self):
        """ Returns outputs of model. """
        return [t.shape for t in self._times]

    def variable_parameter_names(self):
        """ The order expected for parameter inputs to simulate. """
        return self._variable_parameter_names

    def fixed_parameter_names(self):
        """ The fixed parameters of model. """
        return self._fixed_parameter_names
