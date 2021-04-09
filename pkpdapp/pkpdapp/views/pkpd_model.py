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
)
from django.urls import reverse_lazy
from pkpdapp.models import (PharmacokineticModel, DosedPharmacokineticModel,
                            PharmacodynamicModel,
                            Dose)
from pkpdapp.dash_apps.model_view import ModelViewState


def create_model_view_state(model, project):
    # create dash state
    state = ModelViewState()
    is_pk = isinstance(model, DosedPharmacokineticModel)
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
    else:
        state.add_model(model.sbml, model.name, is_pk=is_pk, use=True)

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
    template_name = 'dosed_pharmacokinetic_create.html'
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
    template_name = 'dosed_pharmacokinetic_update.html'
    model = DosedPharmacokineticModel
    fields = [
        'pharmacokinetic_model', 'dose_compartment', 'direct_dose',
        'dose_amount', 'dose_start', 'dose_duration', 'dose_period',
        'number_of_doses'
    ]

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
