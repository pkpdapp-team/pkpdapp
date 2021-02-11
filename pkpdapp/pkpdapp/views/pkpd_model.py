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
from pkpdapp.models import PkpdModel


class PkpdModelDetailView(DetailView):
    model = PkpdModel
    template_name = 'pkpd_model_detail.html'


class PkpdModelListView(ListView):
    model = PkpdModel
    template_name = 'pkpd_model_list.html'


class PkpdModelCreate(CreateView):
    model = PkpdModel
    fields = ['name', 'description']
    template_name = 'pkpd_model_form.html'


class PkpdModelUpdate(UpdateView):
    model = PkpdModel
    fields = ['name', 'description']
    template_name = 'pkpd_model_form.html'


class PkpdModelDelete(DeleteView):
    model = PkpdModel
    success_url = reverse_lazy('pkpd_model-list')
    template_name = 'pkpd_model_confirm_delete.html'