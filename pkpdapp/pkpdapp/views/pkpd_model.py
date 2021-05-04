#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.views.generic import (DetailView, CreateView, UpdateView,
                                  DeleteView, ListView)
from django.contrib.auth.mixins import LoginRequiredMixin
from pkpdapp.forms import (
    CreateNewPharmodynamicModel,
    CreateNewDosedPharmokineticModel,
    CreateNewPkpdModel,
)
from django.urls import reverse_lazy
from pkpdapp.models import (
    PharmacokineticModel, DosedPharmacokineticModel,
    PharmacodynamicModel, PkpdModel,
    Dose, Biomarker, BiomarkerType, Protocol
)
import pandas as pd
from pkpdapp.dash_apps.model_view import ModelViewState


def create_model_view_state(model, project):
    # create dash state
    state = ModelViewState()
    is_pk = isinstance(model, DosedPharmacokineticModel)
    is_pkpd = isinstance(model, PkpdModel)
    if is_pk:
        state.add_model(
            model.pharmacokinetic_model.sbml,
            model.name,
            time_max=model.pharmacokinetic_model.time_max,
            is_pk=is_pk, use=True
        )
        state.set_administration(
            model.dose_compartment,
            direct=model.protocol.dose_type == Protocol.DoseType.DIRECT
        )
        events = [
            (d.amount, d.start_time, d.duration)
            for d in Dose.objects.filter(protocol=model.protocol)
        ]
        state.set_dosing_events(events, time_max=model.time_max)
    elif is_pkpd:
        state.add_model(
            model.sbml, model.name,
            time_max=model.time_max,
            is_pk=True, use=True
        )
        state.set_administration(
            model.dose_compartment,
            direct=model.protocol.dose_type == Protocol.DoseType.DIRECT
        )
        events = [
            (d.amount, d.start_time, d.duration)
            for d in Dose.objects.filter(protocol=model.protocol)
        ]
        state.set_dosing_events(events, time_max=None)

    else:
        state.add_model(
            model.sbml, model.name,
            time_max=model.time_max,
            is_pk=is_pk, use=True
        )

    # add datasets
    if project is None:
        return state

    for dataset in project.datasets.all():
        biomarker_types = BiomarkerType.objects.filter(dataset=dataset)
        biomarkers = Biomarker.objects\
            .filter(biomarker_type__in=biomarker_types)

        if biomarkers:
            biomarker_units = {
                b['name']: b['unit__symbol']
                for b in biomarker_types.values(
                    'name', 'unit__symbol'
                )
            }

            df = pd.DataFrame(
                list(
                    biomarkers.values(
                        'time', 'subject_id',
                        'biomarker_type__name',
                        'value'
                    )
                )
            )
            df.rename(columns={
                'subject_id': 'ID',
                'time': 'Time',
                'biomarker_type__name': 'Biomarker',
                'value': 'Measurement'
            }, inplace=True)

            state.add_data(df, dataset.name, biomarker_units)

    return state


class PharmacodynamicModelDetailView(LoginRequiredMixin, DetailView):
    model = PharmacodynamicModel
    template_name = 'pd_model_detail.html'

    def get(self, request, *args, **kwargs):
        session = request.session
        session['django_plotly_dash'] = {
            'model_view': create_model_view_state(
                self.get_object(),
                self.request.user.profile.selected_project
            ).to_json()
        }
        return super().get(request)


class PharmacodynamicModelListView(ListView):
    model = PharmacodynamicModel
    template_name = 'pd_model_list.html'


class PharmacodynamicModelCreate(CreateView):
    model = PharmacodynamicModel
    form_class = CreateNewPharmodynamicModel
    template_name = 'pd_model_form.html'

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        if 'project' in self.kwargs:
            kwargs['project'] = self.kwargs['project']
        return kwargs

    def get_success_url(self):
        return reverse_lazy('pd_model-detail', kwargs={'pk': self.object.pk})


class PharmacodynamicModelUpdate(UpdateView):
    model = PharmacodynamicModel
    fields = ['name', 'description', 'sbml', 'time_max']
    template_name = 'pd_model_form.html'


class PharmacodynamicModelDeleteView(DeleteView):
    model = PharmacodynamicModel
    success_url = reverse_lazy('pd_model-list')
    template_name = 'pd_model_confirm_delete.html'


class DosedPharmacokineticModelDetail(LoginRequiredMixin, DetailView):
    template_name = 'dosed_pharmacokinetic_detail.html'
    fields = [
        'pharmacokinetic_model', 'dose_compartment', 'protocol', 'time_max'
    ]
    model = DosedPharmacokineticModel

    def get(self, request, *args, **kwargs):
        session = request.session
        session['django_plotly_dash'] = {
            'model_view': create_model_view_state(
                self.get_object(),
                self.request.user.profile.selected_project
            ).to_json()
        }
        return super().get(request)


class DosedPharmacokineticModelCreate(LoginRequiredMixin, CreateView):
    template_name = 'dosed_pharmacokinetic_form.html'
    model = DosedPharmacokineticModel
    form_class = CreateNewDosedPharmokineticModel

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        if 'project' in self.kwargs:
            kwargs['project'] = self.kwargs['project']
        return kwargs


class DosedPharmacokineticModelUpdate(LoginRequiredMixin, UpdateView):
    """
    This class defines the interface for model simulation.
    """
    template_name = 'dosed_pharmacokinetic_form.html'
    model = DosedPharmacokineticModel
    form_class = CreateNewDosedPharmokineticModel

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        kwargs['project'] = self.request.user.profile.selected_project.id
        return kwargs


class PkpdModelDetail(LoginRequiredMixin, DetailView):
    template_name = 'pkpd_model_detail.html'
    fields = [
        'name', 'sbml', 'dose_compartment', 'protocol', 'time_max',
    ]
    model = PkpdModel

    def get(self, request, *args, **kwargs):
        session = request.session
        session['django_plotly_dash'] = {
            'model_view': create_model_view_state(
                self.get_object(),
                self.request.user.profile.selected_project
            ).to_json()
        }
        return super().get(request)


class PkpdModelCreate(LoginRequiredMixin, CreateView):
    template_name = 'pkpd_model_form.html'
    model = PkpdModel
    form_class = CreateNewPkpdModel

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        if 'project' in self.kwargs:
            kwargs['project'] = self.kwargs['project']
        else:
            kwargs['project'] = self.request.user.profile.selected_project.id

        return kwargs


class PkpdModelUpdate(LoginRequiredMixin, UpdateView):
    template_name = 'pkpd_model_form.html'
    model = PkpdModel
    form_class = CreateNewPkpdModel

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        if 'project' in self.kwargs:
            kwargs['project'] = self.kwargs['project']
        else:
            kwargs['project'] = self.request.user.profile.selected_project.id
        return kwargs


class PharmacokineticModelDetail(DetailView):
    model = PharmacokineticModel
    template_name = 'pk_model_detail.html'
