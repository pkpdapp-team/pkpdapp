#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.views.generic import (
    DetailView, CreateView,
    UpdateView, DeleteView,
    ListView,
)
from pkpdapp.forms import CreateNewPkpdModel
from django.urls import reverse_lazy
from pkpdapp.models import (
    PharmokineticModel, DosedPharmokineticModel, PharmacodynamicModel
)


class PharmacodynamicModelDetailView(DetailView):
    model = PharmacodynamicModel
    template_name = 'pkpd_model_detail.html'


class PharmacodynamicModelListView(ListView):
    model = PharmacodynamicModel
    template_name = 'pkpd_model_list.html'


class PharmacodynamicModelCreate(CreateView):
    model = PharmacodynamicModel
    form_class = CreateNewPkpdModel
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

class PharmacokineticModelCreate(CreateView):
    model = PharmacokineticModel
    form_class = CreateNewPkpdModel
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




class PkpdModelUpdate(UpdateView):
    model = PharmacodynamicModel
    fields = ['name', 'description', 'model_type', 'sbml']
    template_name = 'pkpd_model_form.html'


class PharmacodynamicModelDeleteView(DeleteView):
    model = PharmacodynamicModel
    success_url = reverse_lazy('pharmodynamic_model-list')
    template_name = 'pkpd_model_confirm_delete.html'
