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
from django.core.paginator import Paginator
from pkpdapp.models import Dataset, Biomarker, BiomarkerType


class DatasetDetailView(DetailView):
    model = Dataset
    paginate_by = 100
    template_name = 'dataset_detail.html'

    def get_context_data(self, **kwargs):
        # Call the base implementation first to get a context
        context = super().get_context_data(**kwargs)
        # Add in a QuerySet of all the books

        context['biomarker_types'] = BiomarkerType.objects.filter(
            dataset=context['dataset']
        )
        biomarker_dataset = self.get_paginated_biomarker_dataset(context)
        context['biomarker_dataset'] = biomarker_dataset
        context['page_obj'] = biomarker_dataset
        return context

    def get_paginated_biomarker_dataset(self, context):
        queryset = Biomarker.objects.filter(
            biomarker_type__dataset=context['dataset']
        ).order_by('id')
        paginator = Paginator(queryset, 20)  # paginate_by
        page = self.request.GET.get('page')
        activities = paginator.get_page(page)
        return activities


class DatasetListView(ListView):
    model = Dataset
    template_name = 'dataset_list.html'


class DatasetCreate(CreateView):
    model = Dataset
    fields = ['name', 'description']
    template_name = 'dataset_form.html'


class DatasetUpdate(UpdateView):
    model = Dataset
    fields = ['name', 'description']
    template_name = 'dataset_form.html'


class DatasetDelete(DeleteView):
    model = Dataset
    success_url = reverse_lazy('dataset-list')
    template_name = 'dataset_confirm_delete.html'
