#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.apps import AppConfig
from dash.dependencies import Input, Output
import erlotinib as erlo

from .dash_apps.simulation import PDSimulationApp

# Get data and model
data = erlo.DataLibrary().lung_cancer_control_group()
path = erlo.ModelLibrary().tumour_growth_inhibition_model_koch()
model = erlo.PharmacodynamicModel(path)
model.set_parameter_names(names={
    'myokit.drug_concentration': 'Drug concentration in mg/L',
    'myokit.tumour_volume': 'Tumour volume in cm^3',
    'myokit.kappa': 'Potency in L/mg/day',
    'myokit.lambda_0': 'Exponential growth rate in 1/day',
    'myokit.lambda_1': 'Linear growth rate in cm^3/day'})

# Set up demo app
app = PDSimulationApp()
app.add_model(model)
app.add_data(data, biomarker='Tumour volume')

# Define a simulation callback
sliders = app.slider_ids()


@app.app.callback(
    Output('fig', 'figure'),
    [Input(s, 'value') for s in sliders])
def update_simulation(*args):
    """
    Simulates the model for the current slider values and updates the
    model plot in the figure.
    """
    parameters = args
    fig = app.update_simulation(parameters)

    return fig


class SimulateConfig(AppConfig):
    name = 'simulate'
