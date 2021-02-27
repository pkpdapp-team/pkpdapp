#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.views.generic import (
    DetailView, CreateView,
    UpdateView, DeleteView,
    ListView, TemplateView
)
from django.contrib.auth.mixins import LoginRequiredMixin
from pkpdapp.forms import (
    CreateNewPharmodynamicModel,
    CreateNewDosedPharmokineticModel,
)
from django.urls import reverse_lazy
from pkpdapp.models import (
    PharmacokineticModel, DosedPharmacokineticModel, PharmacodynamicModel,
    Biomarker, BiomarkerType
)
import pandas as pd
from pkpdapp.dash_apps.simulation import PKSimulationApp
import pkpdapp.erlotinib as erlo
from dash.dependencies import Input, Output
import dash


class PharmacodynamicModelDetailView(DetailView):
    model = PharmacodynamicModel
    template_name = 'pkpd_model_detail.html'

class PharmacodynamicModelListView(ListView):
    model = PharmacodynamicModel
    template_name = 'pkpd_model_list.html'

class PharmacodynamicModelCreate(CreateView):
    model = PharmacodynamicModel
    form_class = CreateNewPharmodynamicModel
    template_name = 'pkpd_model_form.html'

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        if 'project' in self.kwargs:
            kwargs['project'] = self.kwargs['project']
        return kwargs

    def get_success_url(self):
        return reverse_lazy(
            'pkpd_model-detail',
            kwargs={'pk': self.object.pk}
        )
class PharmacodynamicModelUpdate(UpdateView):
    model = PharmacodynamicModel
    fields = ['name', 'description', 'sbml']
    template_name = 'pkpd_model_form.html'


class PharmacodynamicModelDeleteView(DeleteView):
    model = PharmacodynamicModel
    success_url = reverse_lazy('pharmodynamic_model-list')
    template_name = 'pkpd_model_confirm_delete.html'


class DosedPharmacokineticModelCreate(LoginRequiredMixin, CreateView):
    """
    This class defines the interface for model simulation.
    """
    template_name = 'dosed_pharmacokinetic_create.html'
    # form_class = CreateNewDosedPharmokineticModel
    fields = ['pharmacokinetic_model', 'dose_compartment', 'direct_dose', 'dose_amount', 'dose_start',
              'dose_duration', 'dose_period', 'number_of_doses']
    model = DosedPharmacokineticModel

    def get(self, request, *args, **kwargs):
        # create dash app
        app = PKSimulationApp(name='dosed_parmokinetic_create')
        self._app = app

        # get model sbml strings and add erlo models
        for i, m in enumerate(PharmacokineticModel.objects.all()):
            sbml_str = m.sbml.encode('utf-8')
            erlo_m = erlo.PharmacokineticModel(sbml_str)
            param_names = erlo_m.parameters()
            param_names_dict = {}
            for p in param_names:
                param_names_dict[p] = p.replace('.', '_')
            erlo_m.set_parameter_names(names=param_names_dict)
            app.add_model(erlo_m, m.name, use=i == 0)

        # add datasets
        project = self.request.user.profile.selected_project
        for i, d in enumerate(project.datasets.all()):
            biomarker_types = BiomarkerType.objects.filter(dataset=d)
            biomarkers = Biomarker.objects\
                .select_related('biomarker_type__name')\
                .filter(biomarker_type__in=biomarker_types)

            # convert to pandas dataframe with the column names expected
            df = pd.DataFrame(
                list(
                    biomarkers.values('time', 'subject_id',
                                      'biomarker_type__name', 'value')))
            df.rename(columns={
                'subject_id': 'ID',
                'time': 'Time',
                'biomarker_type__name': 'Biomarker',
                'value': 'Measurement'
            }, inplace=True)

            app.add_data(df, d.name, use=i == 0)

        # generate dash app
        app.set_layout()

        # we need slider ids for callback, count the number of parameters for
        # each model so we know what parameter in the list corresponds to which
        # model
        sliders = app.slider_ids()
        n_params = [len(s) for s in sliders]
        offsets = [0]
        for i in range(1, len(n_params)):
            offsets.append(offsets[i - 1] + n_params[i])

        @app.app.callback(Output('slider-tabs', 'children'),
                          [Input('model-select', 'value')])
        def update_models_used(use_models):
            """
            if the models selected are changed, then update the slider tabs
            (only show those tabs that are selected)
            """
            app.set_used_models(use_models)
            tabs = app.set_slider_disabled()
            return tabs

        # Define simulation callbacks
        @app.app.callback(Output('fig', 'figure'),
                          [Input(s, 'value') for s in sum(sliders, [])],
                          [Input('model-select', 'value'),
                           Input('dataset-select', 'value'),
                           Input('biomarker-select', 'value')])
        def update_simulation(*args):
            """
            if the models, datasets or biomarkers are
            changed then regenerate the figure entirely

            if a slider is moved, determine the relevent model based on the id
            name, then update that particular simulation
            """
            ctx = dash.callback_context
            cid = None
            if ctx.triggered:
                cid = ctx.triggered[0]['prop_id'].split('.')[0]
            print('ARGS', args)

            if cid == 'model-select':
                print('update models')
                app.set_used_models(args[-3])
                return app.create_figure()
            elif cid == 'dataset-select':
                print('update datasets')
                app.set_used_datasets(args[-2])
                return app.create_figure()
            elif cid == 'biomarker-select':
                app.set_used_biomarker(args[-1])
                return app.create_figure()
            elif cid is not None:
                model_index = int(cid[:2])
                n = n_params[model_index]
                offset = offsets[model_index]
                parameters = args[offset:offset + n]
                return app.update_simulation(model_index, parameters)

            return app._fig._fig

        return super().get(request)
