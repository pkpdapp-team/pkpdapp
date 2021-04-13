#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import dash_bootstrap_components as dbc
import dash_core_components as dcc
import dash_html_components as html
import pkpdapp.erlotinib as erlo
import plotly.graph_objects as go
import django_plotly_dash as dpd
from dash.dependencies import Input, Output, ALL
import numpy as np
import pandas as pd
import json
import threading
import myokit

max_sliders = 20


# Create data view
app = dpd.DjangoDash(
    name='model_view',
    add_bootstrap_links=True
)

app_lock = threading.Lock()

app.layout = dbc.Container(id='container', children=[
    dbc.Row([
        dbc.Col(
            children=[
                dcc.Graph(
                    figure=go.Figure(),
                    id='fig',
                    style={'height': '550px'}
                )
            ],
        ),
        dbc.Col(id='sliders', children=[],
                width=3, style={'marginTop': '5em'})
    ])
], fluid=True, style={'height': '90vh'})


@app.callback(
    Output('sliders', 'children'),
    [Input('container', 'style')],
)
def update_sliders(_, session_state=None):
    if session_state is None:
        raise NotImplementedError("Cannot handle a missing session state")

    state = session_state.get('model_view', None)

    if state is None:
        raise NotImplementedError('DataViewState missing in session state')

    state = ModelViewState.from_json(state)
    return state._create_sliders_component()


@app.callback(
    Output('fig', 'figure'),
    Input({'type': 'slider', 'index': ALL}, 'value')
)
def update_simulation(sliders, session_state=None):
    """
    if any sliders are changed then regenerate the figure entirely
    """
    if session_state is None:
        raise NotImplementedError("Cannot handle a missing session state")

    state = session_state.get('model_view', None)

    if state is None:
        raise NotImplementedError('DataViewState missing in session state')

    state = ModelViewState.from_json(state)

    model_index = 0
    parameters = sliders[:len(state._parameters[model_index])]
    return state.update_simulation(model_index, parameters)


class ModelViewState:
    """
    State class for model view app
    """
    _id_key = 'ID'
    _time_key = 'Time'
    _biom_key = 'Biomarker'
    _meas_key = 'Measurement'
    _times_num = 100

    def __init__(self):

        # Create defaults
        self._multiple_models = True
        self._models = []
        self._is_pk = []
        self._use_models = []
        self._model_names = []
        self._parameters = []
        self._parameter_names = []
        self._n_states = []
        self._times = np.linspace(
            start=0, stop=30, num=self._times_num
        )

        self._direct = True
        self._compartment = 'central'
        self._dosing_events = []

    def to_json(self):
        return json.dumps({
            '_multiple_models': self._multiple_models,
            '_models': [m.decode() for m in self._models],
            '_is_pk': self._is_pk,
            '_use_models': self._use_models,
            '_model_names': self._model_names,
            '_parameters': self._parameters,
            '_parameter_names': self._parameter_names,
            '_n_states': self._n_states,
            '_times': self._times.tolist(),
            '_direct': self._direct,
            '_compartment': self._compartment,
            '_dosing_events': self._dosing_events,
        })

    @classmethod
    def from_json(cls, j):
        data_dict = json.loads(j)
        o = cls()
        o._multiple_models = data_dict['_multiple_models']
        o._models = data_dict['_models']
        o._is_pk = data_dict['_is_pk']
        o._use_models = data_dict['_use_models']
        o._model_names = data_dict['_model_names']
        o._parameters = data_dict['_parameters']
        o._parameter_names = data_dict['_parameter_names']
        o._n_states = data_dict['_n_states']
        o._times = np.array(data_dict['_times'])
        o._direct = data_dict['_direct']
        o._compartment = data_dict['_compartment']
        o._dosing_events = data_dict['_dosing_events']
        return o

    def set_administration(self, compartment, direct=True):
        r"""
        Sets the route of administration

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
        self._compartment = compartment
        self._direct = direct

    def set_dosing_events(self, dosing_events):
        """
        Sets the dosing events, which is a list of tuples
        (d.amount, d.start_time, d.duration)

        """
        self._dosing_events = dosing_events

        # try to intelligently chose an integration period
        # based on the dosing events
        min_time = 0
        max_time = 30
        time_scale = 15  # TODO base this on something!
        if len(self._dosing_events) > 0:
            # if doses, base it on the last start time and duration
            # plus some timescale
            e0 = self._dosing_events[-1]
            max_time = e0[1] + e0[2] + time_scale
        if len(self._dosing_events) > 1:
            # if more than two doses, use the distance between them
            # as the timescale
            e0 = self._dosing_events[-2]
            e1 = self._dosing_events[-1]
            time_scale = e1[1] - e0[1]
            max_time = e1[1] + e1[2] + time_scale
        self._times = np.linspace(
            min_time, max_time, num=self._times_num
        )

    def set_multiple_models(self, value):
        self._multiple_models = value

    def set_used_models(self, value):
        """
        set model indices that will be used
        """
        self._use_models = value

    def _add_simulation_to_fig(self, fig):
        """
        Adds trace of simulation results to the figure.
        """
        model_traces = [-1] * len(self._models)
        for i in range(len(self._models)):
            if i not in self._use_models:
                continue
            model = self._models[i]
            parameters = self._parameters[i]
            is_pk = self._is_pk[i]

            # Add simulation to figure
            result, output_names = self._simulate(parameters, model, is_pk)
            for output in output_names:
                fig.add_simulation(result, biom_key=output)

            # Remember index of model trace for update callback
            n_traces = len(fig._fig.data)
            model_traces[i] = n_traces - 1
        fig.set_axis_labels('Time', 'Biomarker')
        self._model_traces = model_traces
        return fig

    def model_select_options(self):
        return [
            {
                'label': name,
                'value': i
            } for i, name in enumerate(self._model_names)
        ]

    def create_figure(self):
        """
        returns the main figure
        """
        fig = erlo.plots.PDTimeSeriesPlot(updatemenu=False)
        self._add_simulation_to_fig(fig)
        return fig._fig

    def _create_sliders(self, model_index, model):
        """
        Creates one slider for each parameter, and groups the slider by
        1. Pharmacokinetic input
        2. Initial values (of states)
        3. Parameters
        """
        sliders = _SlidersComponent()
        parameters = self._parameter_names[model_index]
        parameter_values = self._parameters[model_index]
        # Add one slider for each parameter
        for i, parameter in enumerate(parameters):
            min_value = 0
            max_value = 2
            if parameter_values[i] < min_value:
                min_value = 2 * parameter_values[i]
            if parameter_values[i] > max_value:
                max_value = 2 * parameter_values[i]

            sliders.add_slider(i, parameter,
                               min_value=min_value,
                               max_value=max_value,
                               value=parameter_values[i])

        # Split parameters into initial values and parameters
        n_states = self._n_states[model_index]
        states = list(range(n_states))
        parameters = list(range(n_states, len(parameters)))

        # Create initial values slider group
        sliders.group_sliders(slider_indices=states, group_id='Initial values')

        # Create parameters slider group
        sliders.group_sliders(slider_indices=parameters, group_id='Parameters')

        return sliders

    def set_slider_disabled(self, slider_tabs):
        """
        Disables parameter slider tabs if the model is not chosen

        Returns new slider tabs
        """
        for i, t in enumerate(slider_tabs):
            if i in self._use_models:
                t.disabled = False
                t.label = self._trim_model_name(self._model_names[i])
            else:
                t.disabled = True
                t.label = ''
        return slider_tabs

    def _trim_model_name(self, name):
        n = 26
        if len(name) > n:
            name = name[:n] + '...'
        return name

    def _create_sliders_component(self):
        """
        Returns all the sliders for a tab/model.
        """

        sliders_components = [
            self._create_sliders(i, m) for i, m in enumerate(self._models)
        ]

        return sliders_components[0]()

    def _convert_to_erlo_model(self, sbml, is_pk):
        if isinstance(sbml, str):
            sbml = sbml.encode()
        if is_pk:
            erlo_m = erlo.PharmacokineticModel(sbml)
            variables = {
                'central': 'A1',
                'peripheral': 'A2',
                'peripheral2': 'A3',
            }
            erlo_m.set_administration(
                self._compartment, direct=self._direct,
                amount_var='{}_amount'
                .format(variables[self._compartment])
            )

            erlo_m.set_dosing_events(
                self._dosing_events
            )
        else:
            erlo_m = erlo.PharmacodynamicModel(sbml)

        return erlo_m

    def _simulate(self, parameters, sbml, is_pk):
        """
        Returns simulation of pharmacodynamic model in standard format, i.e.
        pandas.DataFrame with 'Time' and 'Biomarker' column.
        """
        with app_lock:
            # compile model
            model = self._convert_to_erlo_model(sbml, is_pk)

            # output concentrations instead of amounts
            outputs = [
                n.replace('_amount', '_concentration')
                for n in model.outputs()
            ]
            model.set_outputs(outputs)

            # Solve the model
            result = model.simulate(parameters, self._times)

        # Rearrange results into a pandas.DataFrame
        result_df = pd.DataFrame({'Time': self._times})

        for i, output in enumerate(model._output_names):
            result_df[output] = result[i, :]

        return result_df, model._output_names

    def add_model(self, sbml, name, is_pk=False, use=False):
        """
        Adds a sbml model to the application.

        Parameters
        ----------
        model
            A :class:`erlotinib.PharmacodynamicModel` representing the model.
        name
            A str name for the model
        mtype
            True if this is a pharmacokinetic model
        use
            Set to True if you want this model to be initially chosen
        """
        if isinstance(sbml, str):
            sbml = sbml.encode()

        try:
            erlo_m = erlo.MechanisticModel(sbml)
        except myokit.formats.sbml._parser.SBMLParsingError:
            return
        param_names = erlo_m.parameters()
        for i, p in enumerate(param_names):
            param_names[i] = p.replace('.', '_')

        self._parameters.append([
            erlo_m._default_values[n] for n in erlo_m.parameters()
        ])
        self._parameter_names.append(param_names)
        self._n_states.append(erlo_m._n_states)
        if use:
            self._use_models.append(len(self._models))
        self._models.append(sbml)
        self._is_pk.append(is_pk)
        self._model_names.append(name)

    def slider_ids(self):
        """
        Returns a list of the slider ids for the callbacks.
        """
        return self._slider_ids

    def update_simulation(self, i, new_parameters):
        """
        Simulates model i for the provided parameters and replaces the
        current simulation plot by the new one.
        """
        for j, p in enumerate(new_parameters):
            if p is not None:
                self._parameters[i][j] = new_parameters[j]

        return self.create_figure()


class _SlidersComponent(object):
    """
    A helper class that helps to organise the sliders of the
    :class:`SimulationController`.

    The sliders are arranged horizontally. Sliders may be grouped by meaning.
    """

    def __init__(self):
        # Set defaults
        self._sliders = {}
        self._labels = {}
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
            for slider_index in group:
                # Create label for slider
                label = html.Label(self._labels[slider_index], style={
                                   'fontSize': '0.8rem'})
                slider = self._sliders[slider_index]

                # Add label and slider to group container
                container += [
                    dbc.Col(children=[label], width=12),
                    dbc.Col(children=[slider], width=12)
                ]

            # Convert slider group to dash component
            group = dbc.Row(children=container, style={'marginBottom': '1em'})

            # Add label and group to contents
            contents += [group_label, group]

        return contents

    def add_slider(self,
                   slider_index,
                   label,
                   value=0.5,
                   min_value=0,
                   max_value=2,
                   n_increments=200):
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
       n_increments
            Number of increments of slider.
        """
        step_size = (max_value - min_value) / n_increments
        self._sliders[slider_index] = dcc.Slider(
            id={
                'type': 'slider',
                'index': slider_index,
            },
            value=value,
            min=min_value,
            max=max_value,
            step=step_size,
            marks={
                str(round(min_value)):
                str(round(min_value)),
                str(round(max_value)):
                str(round(max_value))
            },
            updatemode='mouseup')
        self._labels[slider_index] = label

    def group_sliders(self, slider_indices, group_id):
        """
        Visually groups sliders. Group ID will be used as label.

        Each slider can only be in one group.
        """
        # Check that incoming sliders do not belong to any group already
        for index, existing_group in enumerate(self._slider_groups.values()):
            for slider_index in slider_indices:
                if slider_index in existing_group:
                    raise ValueError(
                        'Slider <' + str(slider_index) +
                        '> exists already in group '
                        '<' +
                        str(list(self._slider_groups.keys())[index]) +
                        '>.'
                    )  # pragma: no cover

        self._slider_groups[group_id] = slider_indices

    def sliders(self):
        """
        Returns a dictionary of slider objects with the slider ID as key and
        the slider object as value.
        """
        return self._sliders
