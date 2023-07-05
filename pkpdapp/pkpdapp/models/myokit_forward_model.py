#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

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
        subjects(=None by default) -- a list of lists of subject ids (0 -> max
        number of subjects) with the same shape as times, if not None then a
        simulation will be run for every individual subject and values written
        out according to this array, if None then only one simulation will be
        run and then broadcast according to times
        representing key-value pairs for fixed parameters
        fixed_parameter_dict(=None by default) -- a dictionary
        representing key-value pairs for fixed parameters
    """

    def __init__(
        self, myokit_simulator, myokit_model,
        outputs, conversion_factors, times, subjects=None,
        fixed_parameter_dict=None
    ):
        model = myokit_model
        self._sim = myokit_simulator
        self._sim.set_tolerance(abs_tol=1e-11, rel_tol=1e-9)

        # get all model states that will be used for inference
        self._n_states = model.count_states()

        # get initial conditions
        self._output_names = [
            var.qname() for var in model.variables(const=False)
        ]

        self._times = [np.array(t) for t in times]
        if subjects is None:
            self._subjects = subjects
        else:
            self._subjects = [np.array(s) for s in subjects]

        self._n_subjects = None

        # if we are dealing with subjects split the times according to subject
        if self._subjects is not None:
            self._n_subjects = max(
                [np.max(s_array) for s_array in self._subjects]
            ) + 1
            print('n_subjects', self._n_subjects, self._subjects)
            self._times_all = []
            self._output_indices = []
            for s in range(self._n_subjects):
                times_by_subject = [
                    t_array[s_array == s]
                    for t_array, s_array in zip(self._times, self._subjects)
                ]
                self._times_all.append(
                    np.sort(list(set(np.concatenate(times_by_subject))))
                )
                self._output_indices.append([
                    np.searchsorted(self._times_all[-1], t)
                    for t in times_by_subject
                ])

        # if not then just make sure we can map from all times back to output
        # times
        else:
            self._times_all = np.sort(list(set(np.concatenate(self._times))))
            self._output_indices = [
                np.searchsorted(self._times_all, t)
                for t in self._times
            ]

        self._state_names = [
            var.qname() for var in model.states()
        ]

        outputs_not_in_model = (
            [v not in self._output_names for v in outputs]
        )
        if any(outputs_not_in_model):
            raise ValueError(
                'All outputs must be within model. Outputs are:', outputs,
                '. Outputs in the model are:', self._output_names
            )
        self._output_names = outputs
        self._conversion_factor = {
            name: conversion_factor
            for name, conversion_factor in zip(outputs, conversion_factors)
        }
        self._n_outputs = len(outputs)

        # find fixed and variable parameters
        self._const_names = [
            var.qname() for var in model.variables(const=True)
        ]

        # parameters are all const variables 
        self._all_parameter_names = self._const_names
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
            self._fixed_parameter_list = [
                self._fixed_parameter_dict[name]
                for name in self._fixed_parameter_names
            ]
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


    def _set_init(self, parameters):
        """
        Sets initial conditions of model.
        """
        model = self._sim._model
        for id_var, var in enumerate(self._const_names):
            model.get(var).set_rhs(float(parameters[id_var]))
        states = model.initial_values(as_floats=True) 

        self._sim.set_state(states)

    def simulate(self, parameters):
        """
        Returns the numerical solution of the model outputs for specified
        parameters. Note, the parameter inputs should be ordered as
        in `variable_parameter_names()`.

        parameters should be 1d if self._subjects is None, 2d if self._subjects
        is not None, with shape (n_parameters, n_subjects)
        """
        parameters = np.array(parameters)

        if self._subjects is None and parameters.ndim != 1:
            raise ValueError(
                'no subjects provided, but parameters shape is {}'.format(
                    parameters.shape
                )
            )

        if self._subjects is not None and parameters.ndim != 2:
            raise ValueError(
                'subjects provided, but parameters shape is {}'.format(
                    parameters.shape
                )
            )

        if parameters.shape[0] != self._n_parameters:
            raise ValueError('Dim 0 of parameters supplied must equal ' +
                             'number of non-fixed model parameters.')

        if (
            self._subjects is not None and
            parameters.shape[1] != self._n_subjects
        ):
            raise ValueError('Dim 1 of of parameters supplied must equal ' +
                             'number of subjects.')

        if self._subjects is None:
            # ensure order of parameters works
            if self._fixed_parameter_dict is None:
                full_parameters = parameters
            else:
                full_parameters = np.empty((self._n_all_parameters))

                # fill up parameter vector with fixed and variable values
                for count, idx in enumerate(self._fixed_parameter_indices):
                    full_parameters[idx] = self._fixed_parameter_list[count]
                for count, idx in enumerate(self._variable_parameter_indices):
                    full_parameters[idx] = parameters[count]

            # Reset simulation
            self._sim.reset()

            # Set constant model parameters
            self._set_const(full_parameters)

            # Set initial conditions
            self._set_init(full_parameters)

            # Simulate: need +100*epsilon for times to ensure simulation
            # surpasses last time
            t_max = self._times_all[-1] + 1e2 * float_info.epsilon
            log_times = self._times_all
            output = self._sim.run(
                t_max,
                log=self._output_names, log_times=log_times
            )

            output = self._convert_units(output)

            result = [
                np.array(output[name])[indices]
                for name, indices in zip(
                    self._output_names,
                    self._output_indices
                )
            ]
        else:
            # ensure order of parameters works
            if self._fixed_parameter_dict is None:
                full_parameters = parameters
            else:
                full_parameters = np.empty((self._n_all_parameters,
                                            self._n_subjects))

                # fill up parameter vector with fixed and variable values
                for count, idx in enumerate(self._fixed_parameter_indices):
                    full_parameters[idx, :] = self._fixed_parameter_list[count]
                for count, idx in enumerate(self._variable_parameter_indices):
                    full_parameters[idx, :] = parameters[count, :]

            # preallocate results
            result = [
                np.empty_like(t) for t in self._times
            ]
            for s in range(self._n_subjects):
                # Reset simulation
                self._sim.reset()

                # Set constant model parameters
                self._set_const(full_parameters[:, s])

                # Set initial conditions
                self._set_init(full_parameters[:, s])


                # Simulate: need +100*epsilon for times to ensure simulation
                # surpasses last time
                t_max = self._times_all[s][-1] + 1e2 * float_info.epsilon
                log_times = self._times_all[s]
                output = self._sim.run(
                    t_max,
                    log=self._output_names, log_times=log_times
                )

                output = self._convert_units(output)

                # scatter this subject's output across result according to
                # output_indices
                for output_index, (name, indices, subjects) in enumerate(zip(
                    self._output_names,
                    self._output_indices[s],
                    self._subjects,
                )):
                    result[output_index][s == subjects] = \
                        np.array(output[name])[indices]

        return result

    def _convert_units(self, output):
        for key, value in output.items():
            output[key] = self._conversion_factor[key] * np.frombuffer(value)
        return output

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
