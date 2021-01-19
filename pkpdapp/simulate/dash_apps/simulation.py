#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import warnings

import dash_bootstrap_components as dbc
import dash_core_components as dcc
import dash_html_components as html
import erlotinib as erlo
import numpy as np
import pandas as pd

from .base import BaseApp


class PDSimulationApp(BaseApp):
    """
    Creates an app which simulates a :class:`erlotinib.PharmacodynamicModel`.

    Parameter sliders can be used to adjust parameter values during
    the simulation.

    Extends :class:`BaseApp`.
    """

    def __init__(self):
        super(PDSimulationApp, self).__init__(
            name='SimulationApp')

        # Instantiate figure and sliders
        self._fig = erlo.plots.PDTimeSeriesPlot(updatemenu=False)
        self._sliders = _SlidersComponent()

        # Create default layout
        self._set_layout()

        # Create defaults
        self._model = None
        self._times = np.linspace(start=0, stop=30)

    def _add_simulation(self):
        """
        Adds trace of simulation results to the figure.
        """
        # Make sure that parameters and sliders are ordered the same
        if self._model.parameters() != list(self._sliders.sliders().keys()):
            raise Warning('Model parameters do not align with slider.')

        # Get parameter values
        parameters = []
        for slider in self._sliders.sliders().values():
            value = slider.value
            parameters.append(value)

        # Add simulation to figure
        result = self._simulate(parameters)
        self._fig.add_simulation(result)

        # Remember index of model trace for update callback
        n_traces = len(self._fig._fig.data)
        self._model_trace = n_traces - 1

    def _create_figure_component(self):
        """
        Returns a figure component.
        """
        figure = dbc.Col(
            children=[dcc.Graph(
                figure=self._fig._fig,
                id='fig',
                style={'height': '100%'})],
            md=9
        )

        return figure

    def _create_sliders(self):
        """
        Creates one slider for each parameter, and groups the slider by
        1. Pharmacokinetic input
        2. Initial values (of states)
        3. Parameters
        """
        parameters = self._model.parameters()
        # Add one slider for each parameter
        for parameter in parameters:
            self._sliders.add_slider(slider_id=parameter)

        # Split parameters into initial values and parameters
        n_states = self._model._n_states
        states = parameters[:n_states]
        parameters = parameters[n_states:]

        # Group parameters:
        # Create PK input slider group
        pk_input = self._model.pk_input()
        if pk_input is not None:
            self._sliders.group_sliders(
                slider_ids=[pk_input], group_id='Pharmacokinetic input')

            # Make sure that pk input is not assigned to two sliders
            parameters.remove(pk_input)

        # Create initial values slider group
        self._sliders.group_sliders(
            slider_ids=states, group_id='Initial values')

        # Create parameters slider group
        self._sliders.group_sliders(
            slider_ids=parameters, group_id='Parameters')

    def _create_sliders_component(self):
        """
        Returns a slider component.
        """
        sliders = dbc.Col(
            children=self._sliders(),
            md=3,
            style={'marginTop': '5em'}
        )

        return sliders

    def _set_layout(self):
        """
        Sets the layout of the app.

        - Plot of simulation/data on the left.
        - Parameter sliders on the right.
        """
        self.app.layout = dbc.Container(
            children=[dbc.Row([
                self._create_figure_component(),
                self._create_sliders_component()])],
            fluid=True,
            style={'height': '90vh'})

    def _simulate(self, parameters):
        """
        Returns simulation of pharmacodynamic model in standard format, i.e.
        pandas.DataFrame with 'Time' and 'Biomarker' column.
        """
        # Solve the model
        result = self._model.simulate(parameters, self._times)

        # Rearrange results into a pandas.DataFrame
        result = pd.DataFrame({'Time': self._times, 'Biomarker': result[0, :]})

        return result

    def add_data(
            self, data, biomarker, id_key='ID', time_key='Time',
            biom_key='Biomarker', meas_key='Measurement'):
        """
        Adds pharmacodynamic time series data of (multiple) individuals to
        the figure.

        Expects a :class:`pandas.DataFrame` with an ID, a time and a PD
        biomarker column, and adds a scatter plot of the biomarker time series
        to the figure. Each individual receives a unique colour.

        Parameters
        ----------
        data
            A :class:`pandas.DataFrame` with the time series PD data in form of
            an ID, time, and biomarker column.
        biomarker
            Selector for the displayed biomarker. The provided value has to be
            an element of the biomarker column.
        id_key
            Key label of the :class:`DataFrame` which specifies the ID column.
            The ID refers to the identity of an individual. Defaults to
            ``'ID'``.
        time_key
            Key label of the :class:`DataFrame` which specifies the time
            column. Defaults to ``'Time'``.
        biom_key
            Key label of the :class:`DataFrame` which specifies the PD
            biomarker column. Defaults to ``'Biomarker'``.
        meas_key
            Key label of the :class:`DataFrame` which specifies the column of
            the measured PD biomarker. Defaults to ``'Measurement'``.
        """
        # Add data to figure
        self._fig.add_data(
            data, biomarker, id_key, time_key, biom_key, meas_key)

        # Set axes labels to time_key and biom_key
        self._fig.set_axis_labels(xlabel=time_key, ylabel=biom_key)

    def add_model(self, model):
        """
        Adds a :class:`erlotinib.PharmacodynamicModel` to the application.

        One parameter slider is generated for each model parameter, and
        the solution for a default set of parameters is added to the figure.
        """
        if self._model is not None:
            # This is a temporary fix! In a future issue we will handle the
            # simulation of multiple models
            raise ValueError(
                'A model has been set previously. The passed model was '
                'therefore ignored.')

        if not isinstance(model, erlo.PharmacodynamicModel):
            raise TypeError(
                'Model has to be an instance of '
                'erlotinib.PharmacodynamicModel.')

        parameter_names = model.parameters()
        for name in parameter_names:
            if '.' in name:
                raise ValueError(
                    'Dots cannot be in the parameter names, or the Dash '
                    'callback fails.')

        self._model = model

        # Add one slider for each parameter to the app
        self._create_sliders()

        # Add simulation of model to the figure
        self._add_simulation()

        # Update layout
        self._set_layout()

    def slider_ids(self):
        """
        Returns a list of the slider ids.
        """
        return list(self._sliders.sliders().keys())

    def update_simulation(self, parameters):
        """
        Simulates the model for the provided parameters and replaces the
        current simulation plot by the new one.
        """
        # Solve model
        result = self._model.simulate(parameters, self._times).flatten()

        # Replace simulation values in plotly.Figure
        self._fig._fig.data[self._model_trace].y = result

        return self._fig._fig


class _SlidersComponent(object):
    """
    A helper class that helps to organise the sliders of the
    :class:`SimulationController`.

    The sliders are arranged horizontally. Sliders may be grouped by meaning.
    """

    def __init__(self):
        # Set defaults
        self._sliders = {}
        self._slider_groups = {}

    def __call__(self):
        # Group and label sliders
        contents = self._compose_contents()

        return contents

    def _compose_contents(self):
        """
        Returns the grouped sliders with labels as a list of dash components.
        """
        contents = []
        for group_id in self._slider_groups.keys():
            # Create label for group
            group_label = html.Label(group_id)

            # Group sliders
            group = self._slider_groups[group_id]
            container = []
            for slider_id in group:
                # Create label for slider
                label = html.Label(slider_id, style={'fontSize': '0.8rem'})
                slider = self._sliders[slider_id]

                # Add label and slider to group container
                container += [
                    dbc.Col(children=[label], width=12),
                    dbc.Col(children=[slider], width=12)]

            # Convert slider group to dash component
            group = dbc.Row(
                children=container, style={'marginBottom': '1em'})

            # Add label and group to contents
            contents += [group_label, group]

        return contents

    def add_slider(
            self, slider_id, value=0.5, min_value=0, max_value=2,
            step_size=0.01):
        """
        Adds a slider.

        Parameters
        ----------
        slider_id
            ID of the slider.
        value
            Default value of the slider.
        min_value
            Minimal value of slider.
        max_value
            Maximal value of slider.
        step_size
            Elementary step size of slider.
        """
        self._sliders[slider_id] = dcc.Slider(
            id=slider_id,
            value=value,
            min=min_value,
            max=max_value,
            step=step_size,
            marks={
                str(min_value): str(min_value),
                str(max_value): str(max_value)},
            updatemode='drag')

    def group_sliders(self, slider_ids, group_id):
        """
        Visually groups sliders. Group ID will be used as label.

        Each slider can only be in one group.
        """
        # Check that incoming sliders do not belong to any group already
        for index, existing_group in enumerate(self._slider_groups.values()):
            for slider in slider_ids:
                if slider in existing_group:
                    raise ValueError(
                        'Slider <' + str(slider) + '> exists already in group '
                        '<' + str(self._slider_groups.keys()[index]) + '>.')

        self._slider_groups[group_id] = slider_ids

    def sliders(self):
        """
        Returns a dictionary of slider objects with the slider ID as key and
        the slider object as value.
        """
        return self._sliders
