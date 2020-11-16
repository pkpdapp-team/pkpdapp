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


class PharmacokineticModel(pints.ForwardModel):
    """
    Creates a `pints.ForwardModel` from a SBML model.

    Arguments:
        path -- Absolute path to SBML model file.
        is_log_transformed -- Flag whether model parameters are
                              log-transformed.
    """

    def __init__(self, path, model_input):
        super(PharmacokineticModel, self).__init__()

        # model = sbml.SBMLImporter().model(path)
        
        model, _, _ = myokit.load(path)
        _, dosing, _ =  myokit.load(model_input)

        # Get the number of states and parameters
        self._n_states = model.count_states()
        n_const = model.count_variables(const=True)
        self._n_parameters = self._n_states + n_const

        # Get constant variable names and state names
        self._state_names = sorted(
            [var.qname() for var in model.states()])
        self._const_names = sorted(
            [var.qname() for var in model.variables(const=True)])
        print(self._state_names , self._const_names)
        # Set default outputs
        self._n_outputs = self._n_states
        self._output_names = self._state_names

        # Create simulator
        self._sim = myokit.Simulation(model, dosing)

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


class PharmacodynamicModel(pints.ForwardModel):
    """
    Creates a `pints.ForwardModel` from a SBML model.

    Arguments:
        path -- Absolute path to SBML model file.
        is_log_transformed -- Flag whether model parameters are
                              log-transformed.
    """

    def __init__(self, path, model_input):
        super(PharmacodynamicModel, self).__init__()

        # model = sbml.SBMLImporter().model(path)
        
        model, _, _ = myokit.load(path)
        _, dosing, _ =  myokit.load(model_input)


        # Get constant variable names and state names
        self._state_names = sorted(
            [var.qname() for var in model.states()])
        # self._const_names = sorted(
        #     [var.qname() for var in model.variables(const=True, bound=False, inter=False, state=False)])
        self._const_names = []
        for var in model.variables(const=True, bound=False, inter=False, state=False):
            if var.is_literal():
                self._const_names.append(var.qname())
        self._const_names = sorted(self._const_names)
        # Get the number of states and parameters
        self._n_states = model.count_states()
        n_const = len(self._const_names)
        self._n_parameters = self._n_states + n_const

        print(self._state_names , self._const_names)
        # Set default outputs
        self._n_outputs = self._n_states
        self._output_names = self._state_names

        # Create simulator
        self._sim = myokit.Simulation(model, dosing)

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
        ids: 'ID'
        time: 'TIME'
        observation value: 'OBS'

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
    n_ids = len(data['ID'].unique())
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
        xaxis_title='Time in' + str(data['TIME_UNIT'].values[0]),
        yaxis_title= str(data['YNAME'].values[0]) + 'in' + str(data['UNIT'].values[0]),
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
    ids = data['ID'].unique()
    for index, id_m in enumerate(ids):
        # Create mask for mouse
        mask = data['ID'] == id_m

        # Get observed data for indiviudal
        observed_times = data['TIME'][mask].to_numpy()
        observed_data = data['OBS'][mask]

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
                # color=colors[index]
                )
        ))


def _add_slider_step_plots(
        fig, data, model, parameters, min_parameters, max_parameters, steps):
    """
    Add a plot for each slider step to the figure.
    """
    # Define time range based on data
    start_experiment = data['TIME'].min()
    end_experiment = data['TIME'].max()
    simulated_times = np.linspace(
        start=start_experiment, stop=end_experiment, num=100)

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
    n_ids = len(data['ID'].unique())

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
data = pd.read_csv(path + '/data/0470-2008_2018-05-09.csv')
observation_name = "Platelets "
drug = "Docetaxel"
data = data.sort_values(['DOSE', 'TIME'], ascending=True)

PD_data = data.loc[((data['DRUG'] == drug) | (data['DRUG'] == 'Controls'))&(data['YNAME'] == observation_name)]
PD_data = PD_data.drop(PD_data[PD_data['OBS'] == '.'].index)

PK_data = data.loc[((data['DRUG'] == drug) | (data['DRUG'] == 'Controls'))&(data['YNAME'] == drug)]
PK_data = PK_data.drop(PK_data[PK_data['OBS'] == '.'].index)

# Define model
model1 = PharmacokineticModel(path + '/model/TwoCompartment_IV_Model.mmt', path + '/model/protocol_New.mmt')
# Define parameter ranges for sliders
default_parametersPK = [0.2, 1, 0.2, 1, 1, 1, 1]
min_parametersPK = [0.1, 0.1, 0.01, 0.01, 0.01, 0.01, 0.01]
max_parametersPK = [1, 5, 0.5, 5, 5, 5, 5]
parameter_namesPK = [
    'Initial Conc in Central Compartment',
    'Initial Conc in Periferal Compartment',
    'Clearance',
    'Qp1',
    'Vc',
    'Vp1',
    'DoseAmount']

# Define model
model2 = PharmacodynamicModel(path + '/model/MyelotoxicityFriberg.mmt', path + '/model/protocol_New.mmt')
# Define parameter ranges for sliders
default_parametersPD = [5.45, 5.45, 5.45, 5.45, 5.45, 0.1, 0.1, 5.45, 135, 0.126, 0.174, 0.5, 0.5, 2, 1, 1]
min_parametersPD = [1, 1, 1, 1, 1, 0.1, 0.1, 1, 50, 0.01, 0.01, 0.1, 0.1, 0.5, 0.5, 0.5]
max_parametersPD = [20, 20, 20, 20, 20, 1, 1, 20, 200, 0.5, 0.5, 1, 1, 10, 10, 10]
parameter_namesPD = [
    'PD.Circ', 
    'PD.Prol', 
    'PD.T1', 
    'PD.T2', 
    'PD.T3', 
    'PK.Drug_Central', 
    'PK.Drug_P1', 
    'PD.Circ_0', 
    'PD.MTT', 
    'PD.Slope', 
    'PD.gamma', 
    'PK.CL', 
    'PK.Qp1', 
    'PK.Vc', 
    'PK.Vp1', 
    'dose.doseAmount']

# Create figure
fig1 = plot_measurements_and_simulation(
    PK_data, model1, default_parametersPK, min_parametersPK, max_parametersPK,
    parameter_namesPK)

# Set height of image
fig1.update_layout(
    height=550
)

# Create figure
fig2 = plot_measurements_and_simulation(
    PD_data, model2, default_parametersPD, min_parametersPD, max_parametersPD,
    parameter_namesPD)

# Set height of image
fig2.update_layout(
    height=550
)

# Create dash apps
app1 = DjangoDash('PKDashBoard')

app1.layout = html.Div(children=[
    dcc.Graph(
        id='PKsimulation-dashboard',
        figure=fig1
    )
])

app2 = DjangoDash('PDDashBoard')

app2.layout = html.Div(children=[
    dcc.Graph(
        id='PDsimulation-dashboard',
        figure=fig2
    )
])
