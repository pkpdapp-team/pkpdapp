#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.views import generic
from django.contrib.auth.mixins import LoginRequiredMixin

from dash.dependencies import Input, Output
import dash
import erlotinib as erlo
import pandas as pd
from pkpdapp.models import Biomarker, BiomarkerType
from pkpdapp.dash_apps.simulation import PDSimulationApp


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

    def get(self, request, *args, **kwargs):
        # create dash app
        app = PDSimulationApp(name='simulation-app')
        self._app = app
        project = self.request.user.profile.selected_project

        # get model sbml strings and add erlo models
        for i, m in enumerate(project.pkpd_models.all()):
            sbml_str = m.sbml.encode('utf-8')
            erlo_m = erlo.PharmacodynamicModel(sbml_str)
            param_names = erlo_m.parameters()
            param_names_dict = {}
            for p in param_names:
                param_names_dict[p] = p.replace('.', '_')
            erlo_m.set_parameter_names(names=param_names_dict)
            app.add_model(erlo_m, m.name, use=i == 0)

        # add datasets
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
