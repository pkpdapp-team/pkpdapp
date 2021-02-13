#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

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

    Parameters
    ----------
    optional name
        Name of the app which is used as reference in HTML templates.
    """

    def __init__(self, name):
        super(PDSimulationApp, self).__init__(name)

        self._id_key = 'ID'
        self._time_key = 'Time'
        self._biom_key = 'Biomarker'
        self._meas_key = 'Measurement'

        self._fig = None

        # Create defaults
        self._models = []
        self._use_models = []
        self._model_names = []
        self._parameters = []
        self._models_traces = []
        self._datasets = []
        self._use_datasets = []
        self._dataset_names = []
        self._data_biomarkers = []
        self._slider_ids = []
        self._slider_tabs = []
        self._times = np.linspace(start=0, stop=30)

    def set_used_datasets(self, value):
        self._use_datasets = value

    def set_used_models(self, value):
        self._use_models = value

    def _add_simulation_to_fig(self):
        """
        Adds trace of simulation results to the figure.
        """
        model_traces = [-1] * len(self._models)
        for i in range(len(self._models)):
            if i not in self._use_models:
                continue
            model = self._models[i]
            parameters = self._parameters[i]
            # Make sure that parameters and sliders are ordered the same
            if len(model.parameters()) != len(parameters):
                raise Warning('Model parameters do not align with slider.')

            # Add simulation to figure
            result = self._simulate(parameters, model)
            self._fig.add_simulation(result)

            # Remember index of model trace for update callback
            n_traces = len(self._fig._fig.data)
            model_traces[i] = n_traces - 1
        self._model_traces = model_traces

    def _create_selects(self):
        return [
            dbc.Col(
                children=[dcc.Dropdown(
                    id='model-select',
                    options=[
                        {'label': name, 'value': i}
                        for i, name in enumerate(self._model_names)
                    ],
                    value=self._use_models,
                    multi=True
                )]
            ),
            dbc.Col(
                children=[dcc.Dropdown(
                    id='dataset-select',
                    options=[
                        {'label': name, 'value': i}
                        for i, name in enumerate(self._dataset_names)
                    ],
                    value=self._use_datasets,
                    multi=True
                )]
            ),
        ]

    def create_figure(self):
        self._fig = erlo.plots.PDTimeSeriesPlot(updatemenu=False)
        self._add_simulation_to_fig()
        self._add_data_to_fig()
        return self._fig._fig

    def _create_figure_component(self):
        """
        Returns a figure component.
        """

        figure = dbc.Col(
            children=[dcc.Graph(
                figure=self.create_figure(),
                id='fig',
                style={'height': '100%'})],
            md=9
        )

        return figure

    def _create_sliders(self, model_index, model):
        """
        Creates one slider for each parameter, and groups the slider by
        1. Pharmacokinetic input
        2. Initial values (of states)
        3. Parameters
        """
        sliders = _SlidersComponent()
        parameters = model.parameters()
        id_format = '{:02d}{}'
        parameters = [
            id_format.format(model_index, p) for p in parameters
        ]
        # Add one slider for each parameter
        for parameter in parameters:
            sliders.add_slider(
                slider_id=parameter
            )

        # Split parameters into initial values and parameters
        n_states = model._n_states
        states = parameters[:n_states]
        parameters = parameters[n_states:]

        # Group parameters:
        # Create PK input slider group
        pk_input = model.pk_input()
        if pk_input is not None:
            pk_input = id_format.format(model_index, pk_input)
            sliders.group_sliders(
                slider_ids=[pk_input], group_id='Pharmacokinetic input')

            # Make sure that pk input is not assigned to two sliders
            parameters.remove(pk_input)

        # Create initial values slider group
        sliders.group_sliders(
            slider_ids=states, group_id='Initial values')

        # Create parameters slider group
        sliders.group_sliders(
            slider_ids=parameters, group_id='Parameters')

        return sliders

    def set_slider_disabled(self):
        for i, t in enumerate(self._slider_tabs):
            if i in self._use_models:
                t.disabled = False
                t.label = self._model_names[i]
            else:
                t.disabled = True
                t.label = ''
        return self._slider_tabs

    def _create_sliders_component(self):
        """
        Returns a slider component.
        """

        sliders_components = [
            self._create_sliders(i, m) for i, m in enumerate(self._models)
        ]

        # save slider ids so we can construct callbacks
        self._slider_ids = [
            list(s.sliders().keys()) for s in sliders_components
        ]

        self._slider_tabs = [
            dbc.Tab(
                children=sliders_components[i](),
                label=self._model_names[i],
            ) for i in range(len(self._model_names))
        ]

        self._slider_tabs = self.set_slider_disabled()

        sliders = dbc.Col(
            children=[
                dbc.Tabs(
                    id='slider-tabs',
                    children=self._slider_tabs,
                )
            ],
            md=3,
            style={'marginTop': '5em'}
        )

        return sliders

    def set_layout(self):
        """
        Sets the layout of the app.

        - Plot of simulation/data on the left.
        - Parameter sliders on the right.
        """
        self.app.layout = dbc.Container(
            children=[
                dbc.Row(
                    self._create_selects(),
                ),
                dbc.Row([
                    self._create_figure_component(),
                    self._create_sliders_component()])
                ],
            fluid=True,
            style={'height': '90vh'})

    def _simulate(self, parameters, model):
        """
        Returns simulation of pharmacodynamic model in standard format, i.e.
        pandas.DataFrame with 'Time' and 'Biomarker' column.
        """
        # Solve the model
        result = model.simulate(parameters, self._times)

        # Rearrange results into a pandas.DataFrame
        result = pd.DataFrame({'Time': self._times, 'Biomarker': result[0, :]})

        return result

    def _add_data_to_fig(self):
        used_datasets = [
            d for i, d in enumerate(self._datasets)
            if i in self._use_datasets
        ]

        combined_data = pd.concat(used_datasets)

        biomarker = self._data_biomarkers[0]

        # Add data to figure
        self._fig.add_data(
            combined_data, biomarker, self._id_key,
            self._time_key, self._biom_key,
            self._meas_key
        )

        # Set axes labels to time_key and biom_key
        self._fig.set_axis_labels(
            xlabel=self._time_key,
            ylabel=self._biom_key
        )

    def add_data(self, data, name, use=False):
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
        """
        if use:
            self._use_datasets.append(len(self._datasets))
        self._datasets.append(data)
        self._dataset_names.append(name)
        self._data_biomarkers.append(data[self._biom_key][0])

    def add_model(self, model, name, use=False):
        """
        Adds a :class:`erlotinib.PharmacodynamicModel` to the application.

        One parameter slider is generated for each model parameter, and
        the solution for a default set of parameters is added to the figure.
        """
        if not isinstance(model, erlo.PharmacodynamicModel):
            raise TypeError(
                'Model has to be an instance of '
                'erlotinib.PharmacodynamicModel.')

        parameter_names = model.parameters()
        for pname in parameter_names:
            if '.' in pname:
                raise ValueError(
                    'Dots cannot be in the parameter names, or the Dash '
                    'callback fails.')

        self._parameters.append([0.5] * len(parameter_names))
        if use:
            self._use_models.append(len(self._models))
        self._models.append(model)
        self._model_names.append(name)

    def slider_ids(self):
        """
        Returns a list of the slider ids.
        """
        return self._slider_ids

    def update_simulation(self, i, new_parameters):
        """
        Simulates model i for the provided parameters and replaces the
        current simulation plot by the new one.
        """
        model = self._models[i]
        self._parameters[i] = new_parameters
        model_parameters = self._parameters[i]
        model_trace = self._model_traces[i]

        # Solve model
        result = model.simulate(model_parameters, self._times).flatten()

        # Replace simulation values in plotly.Figure
        self._fig._fig.data[model_trace].y = result

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
                label = html.Label(slider_id[2:], style={'fontSize': '0.8rem'})
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
            updatemode='mouseup')

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
