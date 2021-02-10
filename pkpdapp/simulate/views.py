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
import re
from pkpdapp.models import Dataset, PkpdModel


def _get_trailing_number(s):
    m = re.search(r'\d+$', s)
    return int(m.group()) if m else None


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
        # extract dataset and model ids from GET parameters
        dataset_ids = []
        model_ids = []
        for k in request.GET.keys():
            if k.startswith('model'):
                model_ids.append(_get_trailing_number(k))
            elif k.startswith('dataset'):
                dataset_ids.append(_get_trailing_number(k))

        # convert ids to model objects
        dataset_objs = [Dataset.objects.get(id=id) for id in dataset_ids]
        model_objs = [PkpdModel.objects.get(id=id) for id in model_ids]


        # create dash app
        app = PDSimulationApp(name='simulation-app')

        # get model sbml strings and add erlo models
        for m in model_objs:
            sbml_str = m.sbml.encode('utf-8')
            erlo_m = erlo.PharmacodynamicModel(sbml_str)
            param_names = erlo_m.parameters()
            param_names_dict = {}
            for p in param_names:
                param_names_dict[p] = p.replace('.', '_')
            erlo_m.set_parameter_names(names=param_names_dict)
            app.add_model(erlo_m)

        # add datasets
        for d in dataset_objs:


        # Define Dash apps that are part of the simulate app
        # Get data and model (temporary, will be replaced by database callback)
        data = erlo.DataLibrary().lung_cancer_control_group()
        #model.set_parameter_names(names={
        #    'myokit.drug_concentration': 'Drug concentration in mg/L',
        #    'myokit.tumour_volume': 'Tumour volume in cm^3',
        #    'myokit.kappa': 'Potency in L/mg/day',
        #    'myokit.lambda_0': 'Exponential growth rate in 1/day',
        #    'myokit.lambda_1': 'Linear growth rate in cm^3/day'})

        # Set up dash app

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

