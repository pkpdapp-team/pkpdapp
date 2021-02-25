#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from django.shortcuts import render
from django.urls import reverse_lazy
from django.core.paginator import Paginator
from pkpdapp.models import Dataset, Biomarker, BiomarkerType
from ..forms import CreateNewDataset, CreateNewBiomarkerUnit
from django.forms import formset_factory
from django.shortcuts import redirect
from django.views.generic import (
    DetailView, CreateView,
    UpdateView, DeleteView,
    ListView
)


BASE_FILE_UPLOAD_ERROR = 'FILE UPLOAD FAILED: '


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
    form_class = CreateNewDataset
    model = Dataset
    template_name = 'dataset_form.html'

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        if 'project' in self.kwargs:
            kwargs['project'] = self.kwargs['project']
        return kwargs

    def get_success_url(self):
        return reverse_lazy(
            'dataset-detail',
            kwargs={'pk': self.object.pk}
        )


class DatasetUpdate(UpdateView):
    model = Dataset
    fields = ['name', 'description']
    template_name = 'dataset_form.html'


class DatasetDelete(DeleteView):
    model = Dataset
    success_url = reverse_lazy('dataset-list')
    template_name = 'dataset_confirm_delete.html'


def update_biomarkertypes_formset(request, pk):
    context = {}
    current_dataset = Dataset.objects.get(pk=pk)
    biomarkertypes = BiomarkerType.objects.filter(dataset=current_dataset)
    BiomarkerFormset = formset_factory(
        CreateNewBiomarkerUnit,
        extra=len(biomarkertypes)
    )
    biomarker_names = []
    biomarker_units = []
    k = 0
    for bm in biomarkertypes:
        biomarker_names.append(biomarkertypes[k].name)
        biomarker_units.append(biomarkertypes[k].unit)
        k += 1
    context["biomarkernames"] = biomarker_names
    if request.method == "POST":
        formset = BiomarkerFormset(request.POST)
        if formset.is_valid():
            k = 0
            print(len(formset))
            for f in formset:
                cd = f.cleaned_data
                unit = cd.get("unit")
                desc = cd.get("description")
                biomarkertypes[k].description = desc
                biomarkertypes[k].unit = unit
                biomarkertypes[k].save()
                k += 1
        return redirect(reverse_lazy(
            'dataset-detail',
            kwargs={'pk': pk}
        ))
    else:
        context["formset"] = BiomarkerFormset
    return render(request, 'biomarker_update.html',
                  context)
