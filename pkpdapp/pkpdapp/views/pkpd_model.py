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
    Dose, Biomarker, BiomarkerType
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
            model.pharmacokinetic_model.name, is_pk=is_pk, use=True
        )
        state.set_administration(model.dose_compartment)
        events = [
            (d.amount, d.start_time, d.duration)
            for d in Dose.objects.filter(protocol=model.protocol)
        ]
        state.set_dosing_events(events)
    elif is_pkpd:
        state.add_model(
            model.sbml,
            model.name, is_pk=True, use=True
        )
        state.set_administration(model.dose_compartment)
        events = [
            (d.amount, d.start_time, d.duration)
            for d in Dose.objects.filter(protocol=model.protocol)
        ]
        state.set_dosing_events(events)

    else:
        state.add_model(model.sbml, model.name, is_pk=is_pk, use=True)

    # add datasets
    if project is None:
        return state

    for dataset in project.datasets.all():
        biomarker_types = BiomarkerType.objects.filter(dataset=dataset)
        biomarkers = Biomarker.objects\
            .filter(biomarker_type__in=biomarker_types)

        if biomarkers:
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

            state.add_data(df, dataset.name)

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
    fields = ['name', 'description', 'sbml']
    template_name = 'pd_model_form.html'


class PharmacodynamicModelDeleteView(DeleteView):
    model = PharmacodynamicModel
    success_url = reverse_lazy('pd_model-list')
    template_name = 'pd_model_confirm_delete.html'


class DosedPharmacokineticModelDetail(LoginRequiredMixin, DetailView):
    template_name = 'dosed_pharmacokinetic_detail.html'
    fields = [
        'pharmacokinetic_model', 'dose_compartment', 'protocol',
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
        'name', 'sbml', 'dose_compartment', 'protocol',
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
        return kwargs


class PkpdModelUpdate(LoginRequiredMixin, UpdateView):
    template_name = 'pkpd_model_form.html'
    model = PkpdModel
    form_class = CreateNewPkpdModel

    def get(self, request, *args, **kwargs):
        session = request.session
        session['django_plotly_dash'] = {
            'model_view': create_model_view_state(
                self.get_object(),
                self.request.user.profile.selected_project
            ).to_json()
        }
        return super().get(request)


class PharmacokineticModelDetail(DetailView):
    model = PharmacokineticModel
    template_name = 'pk_model_detail.html'
