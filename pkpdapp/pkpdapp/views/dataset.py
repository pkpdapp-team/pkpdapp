#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from django.shortcuts import render
from django.views.generic import DetailView, CreateView, UpdateView, DeleteView
from django.urls import reverse_lazy
from pkpdapp.models import Dataset, Biomarker, BiomarkerType
from ..forms import CreateNewDataset, CreateNewBiomarkerUnit
import pandas as pd
from django.contrib import messages
from django.apps import apps
from django.forms import formset_factory


BASE_FILE_UPLOAD_ERROR = 'FILE UPLOAD FAILED: '

biomarkers = [
    {
        'name': 'Tumour volume',
        'unit': 'cm^3',
    },
    {
        'name': 'Body weight',
        'unit': 'g',
    },
]


class DatasetDetailView(DetailView):
    model = Dataset
    template_name = 'dataset_detail.html'

    def get_context_data(self, **kwargs):
        # Call the base implementation first to get a context
        context = super().get_context_data(**kwargs)
        # Add in a QuerySet of all the books
        context['biomarker_dataset'] = Biomarker.objects.filter(
            biomarker_type__dataset=context['dataset']
        )
        context['biomarker_types'] = BiomarkerType.objects.filter(
            dataset=context['dataset']
        )
        return context


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

            Biomarker = apps.get_model("pkpdapp", "Biomarker")
            BiomarkerType = apps.get_model("pkpdapp", "BiomarkerType")

            # find the index of the biomarker type, so we don't have to
            # keep looking it up
            biomarker_index = {}
            for i, b in enumerate(biomarkers):
                biomarker_index[b['name']] = i

            # find all the biomarker types for that dataset
            biomarkers_types_unique = data["biomarker type"].unique()
            formset = formset_factory(
                CreateNewBiomarkerUnit,
                extra=len(biomarkers_types_unique)
            )
            context["formset"] = formset
            context["biomarkernames"] = biomarkers_types_unique

            biomarker_types = [
                BiomarkerType(
                    name=b['name'],
                    description=b['name'],
                    unit=b['unit'],
                    dataset=dataset
                )
                for b in biomarkers
            ]
            [bm.save() for bm in biomarker_types]

            # create all the biomarker measurements for that dataset
            for index, row in data.iterrows():
                index = biomarker_index[row['biomarker type']]
                biomarker = Biomarker(
                    time=row['time'],
                    subject_id=row['subject id'],
                    value=row['value'],
                    biomarker_type=biomarker_types[index]
                )
                biomarker.save()

            context["dataset"] = dataset

    else:
        form = CreateNewDataset()
        context["form"] = form
    return render(request, 'dataset_create.html',
                  context)


class DatasetDelete(DeleteView):
    model = Dataset
    success_url = reverse_lazy('dataset-list')
    template_name = 'dataset_confirm_delete.html'
