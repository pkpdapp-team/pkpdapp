#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.views.generic import (
    DetailView, CreateView,
    UpdateView, DeleteView,
    ListView
)
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


class PkpdModelCreate(CreateView):
    model = PharmacodynamicModel
    fields = ['name', 'description']
    template_name = 'pkpd_model_form.html'


class PkpdModelUpdate(UpdateView):
    model = PharmacodynamicModel
    fields = ['name', 'description']
    template_name = 'pkpd_model_form.html'


class PharmacodynamicModelDeleteView(DeleteView):
    model = PharmacodynamicModel
    success_url = reverse_lazy('pharmodynamic_model-list')
    template_name = 'pkpd_model_confirm_delete.html'
