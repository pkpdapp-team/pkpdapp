#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from django.core.paginator import Paginator
from pkpdapp.models import (
    Dose, Protocol
)
from ..forms import CreateNewProtocol
from django.views.generic import (
    DetailView, CreateView,
    UpdateView, DeleteView,
)


class ProtocolCreate(CreateView):
    model = Protocol
    template_name = 'protocol_create.html'
    form_class = CreateNewProtocol

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        if 'project' in self.kwargs:
            kwargs['project'] = self.kwargs['project']
        return kwargs


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
        ).order_by('start_time')
        paginator = Paginator(queryset, self.paginate_by)
        page = self.request.GET.get('page')
        return paginator.get_page(page)


class ProtocolUpdate(UpdateView):
    model = Protocol
    template_name = 'protocol_update.html'


class ProtocolDelete(DeleteView):
    model = Protocol
    template_name = 'protocol_confirm_delete.html'
