#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.views import generic
from django.contrib.auth.mixins import LoginRequiredMixin

from dash.dependencies import Input, Output
import erlotinib as erlo
from .dash_apps.simulation import PDSimulationApp


class BuildModelView(generic.base.TemplateView):
    """
    This view defines the interface to build a model for simulation.
    """
    template_name = 'simulate/build_model.html'


class SimulationView(LoginRequiredMixin, generic.base.TemplateView):
    """
    This class defines the interface for model simulation.
    """
    template_name = 'simulate/simulation.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['project'] = self.request.user.profile.selected_project
        return context

    def get(self, request, *args, **kwargs):
        # Define Dash apps that are part of the simulate app
        # Get data and model (temporary, will be replaced by database callback)
        data = erlo.DataLibrary().lung_cancer_control_group()
        path = erlo.ModelLibrary().tumour_growth_inhibition_model_koch()
        model = erlo.PharmacodynamicModel(path)
        model.set_parameter_names(names={
            'myokit.drug_concentration': 'Drug concentration in mg/L',
            'myokit.tumour_volume': 'Tumour volume in cm^3',
            'myokit.kappa': 'Potency in L/mg/day',
            'myokit.lambda_0': 'Exponential growth rate in 1/day',
            'myokit.lambda_1': 'Linear growth rate in cm^3/day'})

        # Set up dash app
        app = PDSimulationApp(name='simulation-app')
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

        return super().get(request)

