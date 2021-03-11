#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from django.shortcuts import render
from django.urls import reverse_lazy
from django.core.paginator import Paginator
from pkpdapp.models import (
    Dataset, Biomarker, BiomarkerType, Dose, Compound, Protocol
)
from ..forms import CreateNewProtocol
from pkpdapp.dash_apps.simulation import PDSimulationApp
import pandas as pd
from django.contrib import messages
from django.apps import apps
from django.forms import formset_factory
from django.shortcuts import redirect
from django.views.generic import (
    DetailView, CreateView,
    UpdateView, DeleteView,
    ListView
)
from pkpdapp.dash_apps.demo_nca_app import NcaApp
from dash.dependencies import Input, Output
import dash


class ProtocolCreate(CreateView):
    model = Protocol
    template_name = 'protocol_create.html'
    form_class = CreateNewProtocol


class ProtocolDetailView(DetailView):
    model = Protocol
    paginate_by = 100
    template_name = 'protocol_detail.html'

    def get_context_data(self, **kwargs):
        # Call the base implementation first to get a context
        context = super().get_context_data(**kwargs)
        doses = self.get_paginated_doses(context)
        context['doses'] = doses
        context['page_obj'] = doses
        return context

    def get_paginated_doses(self, context):
        queryset = Dose.objects.filter(
            protocol=context['protocol']
        ).order_by('time')
        paginator = Paginator(queryset, self.paginate_by)
        page = self.request.GET.get('page')
        return paginator.get_page(page)


class ProtocolUpdate(UpdateView):
    model = Protocol
    template_name = 'protocol_update.html'


class ProtocolDelete(DeleteView):
    model = Protocol
    template_name = 'protocol_confirm_delete.html'
