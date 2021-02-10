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
    model = Dataset
    fields = ['name', 'description']
    template_name = 'dataset_form.html'


class DatasetUpdate(UpdateView):
    model = Dataset
    fields = ['name', 'description']
    template_name = 'dataset_form.html'


def create(request):
    context = {}
    if request.method == "POST":
        form = CreateNewDataset(request.POST, request.FILES)
        context["form"] = form

        if form.is_valid():
            uploaded_file = request.FILES['file']

            # handling errors in uploaded files

            # error in file type
            if not uploaded_file.name.endswith('.csv'):
                messages.error(request,
                               BASE_FILE_UPLOAD_ERROR +
                               'THIS IS NOT A CSV FILE.')
                return render(request, 'dataset_create.html',
                              context)

            # error in file content
            print(uploaded_file)
            data = pd.read_csv(uploaded_file)
            colnames = list(data.columns)
            if len(colnames) > 4:
                messages.error(
                    request,
                    BASE_FILE_UPLOAD_ERROR +
                    'THIS FILE HAS TOO MANY COLUMNS. ' +
                    'IT SHOULD ONLY HAVE: subject id, time, biomarker type, ' +
                    'value')
                return render(request, 'dataset_create.html',
                              context)
            required_cols = ['subject id', 'time', 'biomarker type', 'value']
            error_cols = []
            error_string = (BASE_FILE_UPLOAD_ERROR +
                            'FILE DOES NOT CONTAIN: ')
            for col in required_cols:
                if col not in colnames:
                    error_cols.append(col)
            if len(error_cols) > 0:
                messages.error(request,
                               error_string + ', '.join(error_cols))
                return render(request, 'dataset_create.html',
                              context)

            # no errors -> process and save as dataset
            dataset = Dataset(
                name=form.cleaned_data["name"],
                description=form.cleaned_data["description"],
                datetime=form.cleaned_data["datetime"],
                administration_type=form.cleaned_data["administration_type"],
            )
            dataset.save()

            # add to demo project
            Project = apps.get_model("pkpdapp", "Project")
            demo_project = Project.objects.get(name='demo')
            demo_project.datasets.add(dataset)
            context["dataset"] = dataset

            # find all the biomarker types for that dataset
            bts_unique = data["biomarker type"].unique().tolist()
            request.session['bts_unique'] = bts_unique
            request.session['data_raw'] = data.to_json()
            return redirect('dataset-biomarkers')

    else:
        form = CreateNewDataset()
        context["form"] = form
    return render(request, 'dataset_create.html',
                  context)


def select_biomarkers(request):
    context = {}
    bts_unique = request.session["bts_unique"]
    data = pd.read_json(request.session["data_raw"])
    # dataset = request.session["dataset"]
    formset = formset_factory(
        CreateNewBiomarkerUnit,
        extra=len(bts_unique)
    )
    context["biomarkernames"] = bts_unique
    context["formset"] = formset
    dataset = Dataset.objects.latest('id')
    if request.method == "POST":
        formset = formset(request.POST)
        if formset.is_valid():
            biomarker_types = []
            k = 0
            for f in formset:
                cd = f.cleaned_data
                unit = cd.get("unit")
                desc = cd.get("description")
                biomarker_types.append(BiomarkerType(
                    name=bts_unique[k],
                    description=desc,
                    unit=unit,
                    dataset=dataset
                ))
                k += 1
            [bm.save() for bm in biomarker_types]

            # create all the biomarker measurements for that dataset
            # find the index of the biomarker type, so we don't have to
            # keep looking it up
            biomarker_index = {}
            for i, b in enumerate(bts_unique):
                biomarker_index[b] = i
            for index, row in data.iterrows():
                index = biomarker_index[row['biomarker type']]
                biomarker = Biomarker(
                    time=row['time'],
                    subject_id=row['subject id'],
                    value=row['value'],
                    biomarker_type=biomarker_types[index]
                )
                biomarker.save()
        context['dataset'] = dataset
        return render(request, 'dataset_create.html',
                      context)
    else:
        context["formset"] = formset
    return render(request, 'dataset_create.html',
                  context)


class DatasetDelete(DeleteView):
    model = Dataset
    success_url = reverse_lazy('dataset-list')
    template_name = 'dataset_confirm_delete.html'
