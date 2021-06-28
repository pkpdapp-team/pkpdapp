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
import math
import copy
from itertools import chain

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
                html.Label('Compare with dataset:'),
                dcc.Dropdown(
                    id='data-select',
                )
            ],
            width=3,
        ),
        dbc.Col(
            children=[
                html.Label('Use dataset variable:'),
                dcc.Dropdown(
                    id='biomarker-select',
                )
            ],
            width=3,
        ),
        dbc.Col(
            children=[(
                'Model outputs with compatible units '
                'will be converted to match the chosen '
                'dataset variable units'
            )],
            width=3,
        ),

    ]),
    dbc.Row([
        dbc.Col(
            children=[
                dcc.Graph(
                    figure=go.Figure(),
                    id='fig',
                    style={'height': '550px'}
                )
            ],
            width=9,
        ),
        dbc.Col(id='sliders', children=[],
                width=3, style={'marginTop': '5em'})
    ])
], fluid=True, style={'height': '90vh'})


def rehydrate_state(session_state):
    if session_state is None:
        raise NotImplementedError("Cannot handle a missing session state")

    state = session_state.get('model_view', None)

    if state is None:
        raise NotImplementedError('ModelViewState missing in session state')

    return ModelViewState.from_json(state)


@app.callback(
    Output('data-select', 'options'),
    [Input('container', 'style')],
)
def update_data_options(_, session_state=None):
    state = rehydrate_state(session_state)
    return state.dataset_dropdown_options()


@app.callback(
    Output('sliders', 'children'),
    [Input('container', 'style')],
)
def update_sliders(_, session_state=None):
    state = rehydrate_state(session_state)
    return state._create_sliders_component()


@app.callback(
    Output('fig', 'figure'),
    [
        Input({'type': 'slider', 'index': ALL}, 'value'),
        Input('biomarker-select', 'value'),
        Input('data-select', 'value'),
    ]
)
def update_figure(sliders, biomarker_select, data_select, session_state=None):
    """
    if any sliders are changed then regenerate the figure entirely
    """
    state = rehydrate_state(session_state)
    model_index = 0

    state.set_used_biomarker(biomarker_select)
    state.set_used_datasets([data_select])
    parameters = sliders[:len(state._parameters[model_index])]
    return state.update_simulation(model_index, parameters)


@app.callback(
    Output('biomarker-select', 'options'),
    [
        Input('data-select', 'value'),
    ])
def update_biomarker_options(data_select, session_state=None):
    state = rehydrate_state(session_state)
    state.set_used_datasets([data_select])
    options = state.biomarker_dropdown_options()
    return options


class ModelViewState:
    """
    State class for model view app
    """
    _id_key = 'ID'
    _time_key = 'Time'
    _biom_key = 'Biomarker'
    _unit_key = 'BiomarkerUnit'
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
        self._parameters_min_bounds = []
        self._parameters_max_bounds = []
        self._n_states = []
        self._times = np.array([0.0])

        self._direct = True
        self._compartment = None
        self._dosing_events = []

        self._datasets = []
        self._use_datasets = []
        self._dataset_names = []
        self._data_biomarkers = []
        self._use_biomarkers = None

    def to_json(self):
        return json.dumps({
            '_multiple_models': self._multiple_models,
            '_models': [m.decode() for m in self._models],
            '_is_pk': self._is_pk,
            '_use_models': self._use_models,
            '_model_names': self._model_names,
            '_parameters': self._parameters,
            '_parameter_names': self._parameter_names,
            '_parameters_min_bounds':self._parameters_min_bounds,
            '_parameters_max_bounds': self._parameters_max_bounds,
            '_n_states': self._n_states,
            '_times': self._times.tolist(),
            '_direct': self._direct,
            '_compartment': self._compartment,
            '_dosing_events': self._dosing_events,
            '_datasets': [d.to_dict() for d in self._datasets],
            '_use_datasets': self._use_datasets,
            '_dataset_names': self._dataset_names,
            '_data_biomarkers': self._data_biomarkers,
            '_use_biomarkers': self._use_biomarkers,
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
        o._parameters_min_bounds = data_dict['_parameters_min_bounds']
        o._parameters_max_bounds = data_dict['_parameters_max_bounds']
        o._n_states = data_dict['_n_states']
        o._times = np.array(data_dict['_times'])
        o._direct = data_dict['_direct']
        o._compartment = data_dict['_compartment']
        o._dosing_events = data_dict['_dosing_events']
        o._datasets = [
            pd.DataFrame.from_dict(d) for d in data_dict['_datasets']
        ]
        o._use_datasets = data_dict['_use_datasets']
        o._dataset_names = data_dict['_dataset_names']
        o._data_biomarkers = data_dict['_data_biomarkers']
        o._use_biomarkers = data_dict['_use_biomarkers']

        return o

    def set_used_datasets(self, value):
        """
        set dataset indices that will be used
        """
        self._use_datasets = value

    def set_used_biomarker(self, value):
        """
        set biomarker that will be used
        """
        self._use_biomarkers = value

    def dataset_dropdown_options(self):
        """
        create selects for model, dataset and biomarkers up the top of the dash
        app
        """
        return [
            {
                'label': name,
                'value': i
            } for i, name in enumerate(self._dataset_names)
        ]

    def biomarker_dropdown_options(self):
        return [
            {
                'label': '{} ({})'.format(name, unit),
                'value': name
            } for name, unit in
            self._data_biomarkers[self._use_datasets[0]].items()
        ]

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
        for i in range(len(self._models)):
            if not self._is_pk[i]:
                continue
            model_sbml = self._models[i]
            erlo_m = self._convert_to_erlo_model(
                model_sbml, True
            )
            parameters = erlo_m.parameters()
            self._parameter_names[i] = \
                self._convert_parameter_names(erlo_m, parameters)

            self._parameters[i] = [
                erlo_m._default_values[n] for n in parameters
            ]



            self._n_states[i] = erlo_m._n_states

    def set_dosing_events(self, dosing_events, time_max=None):
        """
        Sets the dosing events, which is a list of tuples
        (d.amount, d.start_time, d.duration)

        """
        model_sbml = self._models[0]
        erlo_m = self._convert_to_erlo_model(
            model_sbml, True
        )

        # get conversions
        hours = myokit.Unit.parse_simple('h')
        time_multiplier = myokit.Unit.conversion_factor(
            hours, erlo_m.time_unit()
        ).value()

        if self._compartment is None:
            raise RuntimeError(
                'Need to call set_administration before set_dosing_events'
            )

        amount_var = 'central.drug_amount'
        for v in erlo_m.simulator._model.variables(state=True):
            if self._compartment + '.' in v.qname():
                amount_var = v

        # our dosing amounts are in micrograms
        micrograms = myokit.Unit.parse_simple('ug')
        amount_multiplier = myokit.Unit.conversion_factor(
            micrograms, amount_var.unit()
        ).value()

        # convert to model time and amount units, change amounts to a dose rate
        self._dosing_events = []
        for e in dosing_events:
            if e[2] == 0:
                self._dosing_events.append(
                    (amount_multiplier * e[0] / 0.01,
                     time_multiplier * e[1],
                     0.01)
                )
            else:
                self._dosing_events.append(
                    (amount_multiplier * e[0] / (time_multiplier * e[2]),
                     time_multiplier * e[1],
                     time_multiplier * e[2])
                )

        if time_max is not None:
            # set times to be time_max after the last dosing event
            if len(self._dosing_events) > 0:
                # if doses, base it on the last start time and duration
                # plus some timescale
                e0 = self._dosing_events[-1]
                final_time = e0[1] + e0[2] + time_max
            self._times = np.linspace(
                0, final_time, num=self._times_num
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
            result, output_names, units = \
                self._simulate(parameters, model, is_pk)
            for output, unit in zip(output_names, units):
                name = output.replace('myokit.', '')
                y_mult = 1
                label = name + ' ' + self._repr_myokit_unit(unit)
                if self._use_biomarkers:
                    biomarker_unit = self._data_biomarkers[
                        self._use_datasets[0]
                    ][self._use_biomarkers]
                    biomarker_unit = \
                        myokit.parse_unit(biomarker_unit)
                    try:
                        y_mult = myokit.Unit.conversion_factor(
                            unit, biomarker_unit
                        ).value()
                        label = (name + ' ' +
                                 self._repr_myokit_unit(biomarker_unit))
                    except myokit.IncompatibleUnitError:
                        pass

                fig._fig.add_trace(
                    go.Scatter(
                        x=result['Time'],
                        y=y_mult * result[output],
                        name=label,
                        showlegend=True,
                        mode="lines",
                    )
                )

            # Remember index of model trace for update callback
            n_traces = len(fig._fig.data)
            model_traces[i] = n_traces - 1
        fig.set_axis_labels('Time (h)', 'Variable')
        fig._fig.update_layout(
            updatemenus=[
                # Button for linear versus log scale
                dict(
                    type="buttons",
                    direction="left",
                    buttons=list([
                        dict(
                            args=[{"yaxis.type": "linear"}],
                            label="Linear y-scale",
                            method="relayout"
                        ),
                        dict(
                            args=[{"yaxis.type": "log"}],
                            label="Log y-scale",
                            method="relayout"
                        )
                    ]),
                    pad={"r": 0, "t": -10},
                    showactive=True,
                    x=1.0,
                    xanchor="right",
                    y=1.15,
                    yanchor="top"
                ),
            ],
            yaxis=dict(
                exponentformat='e'
            ),
        )
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
        self._add_data_to_fig(fig)
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
        parameters_min_bounds = self._parameters_min_bounds[model_index]
        parameters_max_bounds = self._parameters_max_bounds[model_index]
        is_pk = self._is_pk[model_index]
        n_states = self._n_states[model_index]
        # Add one slider for each parameter
        for i, parameter in enumerate(parameters):
            print('BOUNDS ---------------')
            print(parameters_min_bounds)
            print('VALUES ---------------')
            print(parameter_values)
            if parameter_values[i]<parameters_min_bounds[i]:
                parameter_values[i] = parameters_min_bounds[i]

            if parameter_values[i]>parameters_max_bounds[i]:
                parameter_values[i] = parameters_max_bounds[i]

            sliders.add_slider(i, parameter,
                               min_value=parameters_min_bounds[i],
                               max_value=parameters_max_bounds[i],
                               value=parameter_values[i])

        # Split parameters into initial values and parameters
        states = list(range(n_states))
        parameters = list(range(n_states, len(parameters)))

        # Create initial values slider group
        sliders.group_sliders(slider_indices=states,
                              group_id='Initial values',
                              hide=is_pk)

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
            amount_var = 'central.drug_amount'
            for v in erlo_m.simulator._model.variables(state=True):
                if self._compartment + '.' in v.qname():
                    amount_var = v
            erlo_m.set_administration(
                self._compartment, direct=self._direct,
                amount_var=amount_var.name()
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
            outputs = []
            for v in chain(
                    model.simulator._model.variables(state=True),
                    model.simulator._model.variables(inter=True),
            ):
                name = v.qname()
                if not name.startswith('dose'):
                    if name.endswith('_amount'):
                        continue
                outputs.append(name)

            model.set_outputs(outputs)

            # Solve the model
            result = model.simulate(parameters, self._times)

        # get time conversion factor to hours
        hours = myokit.Unit.parse_simple('h')
        time_multiplier = myokit.Unit.conversion_factor(
            model.time_unit(), hours
        ).value()

        # Rearrange results into a pandas.DataFrame
        result_df = pd.DataFrame({
            'Time': time_multiplier * self._times
        })

        units = [
            model.simulator._model.get(name).unit()
            for name in model._output_names
        ]

        for i, output in enumerate(model._output_names):
            result_df[output] = result[i, :]

        return result_df, model._output_names, units

    def _add_data_to_fig(self, fig):
        """
        add chosen datasets to figure
        """
        used_datasets = [
            d for i, d in enumerate(self._datasets) if i in self._use_datasets
        ]

        if not used_datasets:
            return

        combined_data = pd.concat(used_datasets)

        biomarker = self._use_biomarkers
        if biomarker is not None:
            # Add data to figure,
            # ignore error if biomarker does not exist
            try:
                fig.add_data(combined_data, biomarker, self._id_key,
                             self._time_key, self._biom_key,
                             self._meas_key)
            except ValueError as e:
                print(e)
                pass

    def add_data(self, data, name, biomarkers, use=False):
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
        name
            A str name for the dataset
        biomarkers
            dict with {biomarker: unit}
        use
            Set to True if you want this dataset to be initially chosen
        """
        if use:
            self._use_datasets.append(len(self._datasets))
        self._datasets.append(data)
        self._dataset_names.append(name)
        self._data_biomarkers.append(biomarkers)

    def _repr_myokit_unit(self, unit):
        # grams
        unit_str = None
        if unit.exponents() == [1, 0, 0, 0, 0, 0, 0]:
            if unit.multiplier() == 1e-3:
                unit_str = 'mg'
            elif unit.multiplier() == 1e-6:
                unit_str = 'μg'
        # grams / m^3
        elif unit.exponents() == [1, -3, 0, 0, 0, 0, 0]:
            if unit.multiplier() == 1:
                unit_str = 'μg/mL'
            elif unit.multiplier() == 1e6:
                unit_str = 'g/mL'
            elif unit.multiplier() == 1e3:
                unit_str = 'mg/mL'
            elif unit.multiplier() == 1e-3:
                unit_str = 'ng/mL'
        # m^3/g/s
        elif unit.exponents() == [-1, 3, -1, 0, 0, 0, 0]:
            if math.isclose(unit.multiplier(), 1 / (24 * 60**2)):
                unit_str = 'mL/μg/d'
            elif math.isclose(unit.multiplier(), 1 / (60**2)):
                unit_str = 'mL/μg/h'
        # m^3/s
        elif unit.exponents() == [0, 3, -1, 0, 0, 0, 0]:
            if math.isclose(unit.multiplier(), 1e-6 / (24 * 60**2)):
                unit_str = 'mL/d'
            elif math.isclose(unit.multiplier(), 1e-6 / (60**2)):
                unit_str = 'mL/h'
            elif math.isclose(unit.multiplier(), 1e-3 / (60**2)):
                unit_str = 'L/h'
        # 1/s
        elif unit.exponents() == [0, 0, -1, 0, 0, 0, 0]:
            if math.isclose(unit.multiplier(), 1 / (24 * 60**2)):
                unit_str = '1/d'
            elif math.isclose(unit.multiplier(), 1 / (60**2)):
                unit_str = '1/h'

        if unit_str is not None:
            return '[' + unit_str + ']'
        else:
            return str(unit)

    def _convert_parameter_names(self, erlo_m, parameters):
        param_names = copy.copy(parameters)

        # make sure myokit has our standard units registered
        units = [
            self._repr_myokit_unit(
                erlo_m.simulator._model.get(n).unit()
            )
            for n in param_names
        ]

        for i, p in enumerate(param_names):
            param_names[i] = p\
                .replace('.', '_')\
                .replace('myokit_', '')\
                .replace('size', 'volume')

        param_names = [
            name + ' ' + unit
            for name, unit in zip(param_names, units)
        ]

        return param_names

    def add_model(self, sbml, name, time_max=30, is_pk=False, use=False, parameters_min_bounds=[], parameters_max_bounds=[]):
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

        if time_max > self._times[-1]:
            self._times = np.linspace(
                start=0, stop=time_max, num=self._times_num
            )

        parameters = erlo_m.parameters()
        self._parameters.append([
            erlo_m._default_values[n] for n in parameters
        ])
        self._parameter_names.append(
            self._convert_parameter_names(erlo_m, parameters)
        )
        self._n_states.append(erlo_m._n_states)
        if not parameters_min_bounds:
            self._parameters_min_bounds.append([0 for i in parameters])
        else :
            self._parameters_min_bounds.append(parameters_min_bounds)

        if not parameters_max_bounds:
            self._parameters_max_bounds.append([10 for i in parameters])
        else:
            self._parameters_max_bounds.append(parameters_max_bounds)


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
        self._hide_groups = {}

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
                label = html.Label(self._labels[slider_index],
                                   style={'fontSize': '0.8rem'})
                slider = self._sliders[slider_index]

                # Add label and slider to group container
                container += [
                    dbc.Col(children=[label], width=12),
                    dbc.Col(children=[slider], width=12)
                ]

            hide = self._hide_groups[group_id]
            style = {'display': 'block', 'width': '100%'}
            if hide:
                style = {'display': 'none', 'width': '100%'}

            # Convert slider group to dash component
            group = dbc.Row(children=container, style={'marginBottom': '1em'})

            # Add label and group to contents
            contents += [html.Div([group_label, group], style=style)]

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
                min_value:
                '{:.2g}'.format(min_value),
                (1 - np.finfo(float).eps) * max_value:
                '{:.2g}'.format(max_value)
            },
            updatemode='mouseup')
        self._labels[slider_index] = label

    def group_sliders(self, slider_indices, group_id, hide=False):
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
        self._hide_groups[group_id] = hide

    def sliders(self):
        """
        Returns a dictionary of slider objects with the slider ID as key and
        the slider object as value.
        """
        return self._sliders
