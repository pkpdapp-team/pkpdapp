#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from django.shortcuts import render
from django.views.generic import DetailView, CreateView, UpdateView, DeleteView
from django.urls import reverse_lazy
from pkpdapp.models import Dataset, Biomarker, BiomarkerType
from ..forms import CreateNewDataset
import pandas as pd
from django.contrib import messages

BASE_FILE_UPLOAD_ERROR = 'FILE UPLOAD FAILED: '


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

        if form.is_valid():
            uploaded_file = request.FILES['file']

            # handling errors in uploaded files

            # error in file type
            if not uploaded_file.name.endswith('.csv'):
                messages.error(request,
                               BASE_FILE_UPLOAD_ERROR +
                               'THIS IS NOT A CSV FILE.')
                return render(request, 'create_dataset.html',
                              {"form": form, "context": context})

            # error in file content
            data = pd.read_csv(uploaded_file)
            colnames = list(data.columns)
            if len(colnames) > 4:
                messages.error(
                    request,
                    BASE_FILE_UPLOAD_ERROR +
                    'THIS FILE HAS TOO MANY COLUMNS. ' +
                    'IT SHOULD ONLY HAVE: id, time, measurement, dose')
                return render(request, 'create_dataset.html',
                              {"form": form, "context": context})
            required_cols = ['id', 'time', 'measurement', 'dose']
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

    else:
        form = CreateNewDataset()
    return render(request, 'create_dataset.html',
                  {"form": form, "context": context})


def upload(request):
    context = {}
    if request.method == 'POST':
        if len(request.FILES) == 0:
            messages.error(request,
                           BASE_FILE_UPLOAD_ERROR + 'NO FILE SELECTED.')
            return render(request, 'upload.html', context)
        uploaded_file = request.FILES['document']
        if not uploaded_file.name.endswith('.csv'):
            messages.error(request,
                           BASE_FILE_UPLOAD_ERROR + 'THIS IS NOT A CSV FILE.')
            return render(request, 'upload.html', context)
        data = pd.read_csv(uploaded_file)
        colnames = list(data.columns)
        if len(colnames) > 4:
            messages.error(request,
                           BASE_FILE_UPLOAD_ERROR +
                           'THIS FILE HAS TOO MANY COLUMNS. ' +
                           'IT SHOULD ONLY HAVE: id, time, measurement, dose')
            return render(request, 'upload.html', context)

        required_cols = ['id', 'time', 'measurement', 'dose']
        error_cols = []
        error_string = (BASE_FILE_UPLOAD_ERROR +
                        'FILE DOES NOT CONTAIN: ')
        for col in required_cols:
            if col not in colnames:
                error_cols.append(col)
        if len(error_cols) > 0:
            messages.error(request,
                           error_string + ', '.join(error_cols))
            return render(request, 'upload.html', context)
        context['url'] = uploaded_file.name
        context['df_html'] = data.to_html()
    return render(request, 'upload.html', context)


class DatasetDelete(DeleteView):
    model = Dataset
    success_url = reverse_lazy('dataset-list')
    template_name = 'dataset_confirm_delete.html'
