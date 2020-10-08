#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

"""
This is just temporary placeholder for an app that
will visualise the model building blocks.
"""

import dash_core_components as dcc
import dash_html_components as html
from django.conf import settings
from django_plotly_dash import DjangoDash
import myokit
import myokit.formats.sbml as sbml
import numpy as np
import pandas as pd
import pints
import plotly.colors
import plotly.graph_objects as go


class PharmacodynamicModel(pints.ForwardModel):
    """
    Creates a `pints.ForwardModel` from a SBML model.

    Arguments:
        path -- Absolute path to SBML model file.
        is_log_transformed -- Flag whether model parameters are
                              log-transformed.
    """

    def __init__(self, path):
        super(PharmacodynamicModel, self).__init__()

        model = sbml.SBMLImporter().model(path)

        # Get the number of states and parameters
        self._n_states = model.count_states()
        n_const = model.count_variables(const=True)
        self._n_parameters = self._n_states + n_const

        # Get constant variable names and state names
        self._state_names = sorted(
            [var.qname() for var in model.states()])
        self._const_names = sorted(
            [var.qname() for var in model.variables(const=True)])

        # Set default outputs
        self._n_outputs = self._n_states
        self._output_names = self._state_names

        # Create simulator
        self._sim = myokit.Simulation(model)

    def _set_const(self, parameters):
        """
        Sets values of constant model parameters.
        """
        for id_var, var in enumerate(self._const_names):
            self._sim.set_constant(var, float(parameters[id_var]))

    def n_parameters(self):
        """
        Returns the number of parameters in the model.

        Parameters of the model are initial state values and structural
        parameter values.
        """
        return self._n_parameters

    def simulate(self, parameters, times):
        """
        Returns the numerical solution of the model outputs for specified
        parameters and times.
        """
        # Reset simulation
        self._sim.reset()

        # Set initial conditions
        self._sim.set_state(parameters[:self._n_states])

        # Set constant model parameters
        self._set_const(parameters[self._n_states:])

        # Simulate
        output = self._sim.run(
            times[-1] + 1, log=self._output_names, log_times=times)
        result = [output[name] for name in self._output_names]

        return np.array(result).flatten()


def plot_measurements_and_simulation(
        data, model, default_parameters, min_parameters, max_parameters,
        parameter_names=None, steps=50):
    """
    Returns a `plotly.graph_objects.Figure` containing the data and simulation
    with interactive sliders.

    This function assumes the following keys naming convention:
        ids: '#ID'
        time: 'TIME in day'
        tumour volume: 'TUMOUR VOLUME in cm^3

    The axis labels as well as the hoverinfo assume that time is measured in
    day, volume is measured in cm^3.

    Arguments:
        data -- A pandas.DataFrame containing the measured time-series data of
                the tumour volume and the mass.
        model -- A `pints.ForwardModel`.
        parameters -- An array-like object with the model parameters for each
                      individual in the dataset.
                      Shape: (n_individuals, n_parameters)
    """
    # Get parameters
    default_parameters = np.asarray(default_parameters)
    min_parameters = np.asarray(min_parameters)
    max_parameters = np.asarray(max_parameters)

    # Define colorscheme
    n_ids = len(data['#ID'].unique())
    colors = plotly.colors.qualitative.Plotly[:n_ids]

    # Create figure
    fig = go.Figure()

    # Plot simulation for each slider step
    _add_slider_step_plots(
        fig, data, model, default_parameters, min_parameters, max_parameters,
        steps)

    # Scatter plot of control growth data
    _add_data(fig, data, colors)

    # Set X, Y axis and figure size
    fig.update_layout(
        autosize=True,
        xaxis_title='Time in day',
        yaxis_title='Tumour volume in cm^3',
        template="plotly_white")

    # Create parameter sliders
    sliders = _create_sliders(
        parameter_names, min_parameters, max_parameters, steps, data)

    # Add switch between linear and log y-scale
    fig.update_layout(
        sliders=sliders,
        updatemenus=[
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
                x=0.0,
                xanchor="left",
                y=1.15,
                yanchor="top"
            ),
            dict(
                type="buttons",
                direction="down",
                buttons=list([
                    dict(
                        args=[{
                            "sliders[0].visible": True,
                            "sliders[1].visible": False,
                            "sliders[2].visible": False}],
                        label="Initial volume",
                        method="relayout"
                    ),
                    dict(
                        args=[{
                            "sliders[0].visible": False,
                            "sliders[1].visible": True,
                            "sliders[2].visible": False}],
                        label="Critical volume",
                        method="relayout"
                    ),
                    dict(
                        args=[{
                            "sliders[0].visible": False,
                            "sliders[1].visible": False,
                            "sliders[2].visible": True}],
                        label="Growth rate",
                        method="relayout"
                    )
                ]),
                pad={"r": 0, "t": -10},
                showactive=True,
                x=1.07,
                xanchor="left",
                y=-0.1,
                yanchor="top"
            ),
        ]
    )

    return fig


def _add_data(fig, data, colors):
    """
    Adds a scatter plot of the data to the figure.
    """
    ids = data['#ID'].unique()
    for index, id_m in enumerate(ids):
        # Create mask for mouse
        mask = data['#ID'] == id_m

        # Get observed data for indiviudal
        observed_times = data['TIME in day'][mask].to_numpy()
        observed_data = data['TUMOUR VOLUME in cm^3'][mask]

        # Plot data
        fig.add_trace(go.Scatter(
            x=observed_times,
            y=observed_data,
            legendgroup="ID: %d" % id_m,
            name="ID: %d" % id_m,
            showlegend=True,
            hovertemplate=(
                "<b>Measurement </b><br>" +
                "ID: %d<br>" % id_m +
                "Time: %{x:} day<br>" +
                "Tumour volume: %{y:.02f} cm^3<br>" +
                "Cancer type: LXF A677<br>" +
                "<extra></extra>"),
            mode="markers",
            marker=dict(
                symbol='circle',
                opacity=0.7,
                line=dict(color='black', width=1),
                color=colors[index])
        ))


def _add_slider_step_plots(
        fig, data, model, parameters, min_parameters, max_parameters, steps):
    """
    Add a plot for each slider step to the figure.
    """
    # Define time range based on data
    start_experiment = data['TIME in day'].min()
    end_experiment = data['TIME in day'].max()
    simulated_times = np.linspace(
        start=start_experiment, stop=end_experiment)

    # Add plot for each slider step
    for param_id in range(model.n_parameters()):
        # Get default parameters
        params = parameters.copy()

        # Create line plot for each slider value
        for value_id, value in enumerate(np.linspace(
                start=min_parameters[param_id],
                stop=max_parameters[param_id], num=steps)):
            # Update parameters
            params[param_id] = value

            # Solve model
            simulated_data = model.simulate(params, simulated_times)

            # Show only first plot
            visible = False
            if param_id == 0 and value_id == 10:
                visible = True

            # Plot slider step
            fig.add_trace(go.Scatter(
                x=simulated_times,
                y=simulated_data,
                legendgroup="Model",
                name="Model",
                showlegend=True,
                hovertemplate=(
                    "<b>Simulation </b><br>" +
                    "Time: %{x:.0f} day<br>" +
                    "Tumour volume: %{y:.02f} cm^3<br>" +
                    "Cancer type: LXF A677<br>" +
                    "<br>" +
                    "<b>Parameters </b><br>" +
                    "Initial tumour volume: %.02f cm^3<br>" % params[0] +
                    "Exp. growth rate: %.02f 1/day<br>" % params[1] +
                    "Lin. growth rate: %.02f cm^3/day<br>" % params[2] +
                    "<extra></extra>"),
                visible=visible,
                mode="lines",
                line=dict(color='Black')
            ))


def _create_sliders(
        parameter_names, min_parameters, max_parameters, steps, data):
    """
    Returns slider objects that can be used in plotly's `update_layout`.
    """
    # Get number of parameters and measured individuals
    n_params = len(parameter_names)
    n_ids = len(data['#ID'].unique())

    # Create slider object for each parameter
    sliders = []
    for param_id in range(n_params):
        # Compute parameter values
        values = np.linspace(
            start=min_parameters[param_id], stop=max_parameters[param_id],
            num=steps)

        # Display plot for slider position and data
        slider_steps = []
        for step in range(steps):
            # All simulations False and data True
            s = dict(
                method="update",
                args=[{
                    "visible": [False] * (n_params * steps) +
                    [True] * n_ids}],
                label='%.02f' % values[step])

            # Make correct simulation visible
            s["args"][0]["visible"][param_id * steps + step] = True

            # Safe slider steps
            slider_steps.append(s)

        # Save slider
        sliders.append(
            dict(
                visible=True if param_id == 0 else False,
                active=10,
                currentvalue=dict(
                    prefix=parameter_names[param_id] + ': '),
                pad={"t": 50},
                steps=slider_steps))

    return sliders


# Import data
path = settings.MEDIA_ROOT
data = pd.read_csv(path + '/data/lxf_control_growth.csv')

# Define model
model = PharmacodynamicModel(
    path + '/model/tumour_growth_without_treatment.xml')

# Define parameter ranges for sliders
default_parameters = [0.2, 1, 0.12]
min_parameters = [0.01, 0.1, 0.01]
max_parameters = [1, 5, 0.5]
parameter_names = [
    'Initial tumour volume in cm^3',
    'Critical tumour volume in cm^3',
    'Growth rate in 1/day']

# Create figure
fig = plot_measurements_and_simulation(
    data, model, default_parameters, min_parameters, max_parameters,
    parameter_names)

# Set height of image
fig.update_layout(
    height=550
)

# Create dash app
app = DjangoDash('DashBoard')

app.layout = html.Div(children=[
    dcc.Graph(
        id='simulation-dashboard',
        figure=fig
    )
])
