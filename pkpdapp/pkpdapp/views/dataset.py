#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from django.shortcuts import render
from django.views.generic import DetailView, CreateView, UpdateView, DeleteView
from django.urls import reverse_lazy
from pkpdapp.models import Dataset, Biomarker, BiomarkerType
from django.core.files.storage import FileSystemStorage
from django.conf import settings
import pandas as pd
from django.contrib import messages


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


def upload(request):
    context = {}
    if request.method == 'POST':
        uploaded_file = request.FILES['document']
        if not uploaded_file.name.endswith('.csv'):
            messages.error(request, 'FILE UPLOAD FAILED: THIS IS NOT A CSV FILE.')
            return render(request, 'upload.html', context)
        path = settings.MEDIA_ROOT
        fs = FileSystemStorage(location=path + '/data/')
        name = fs.save(uploaded_file.name, uploaded_file)
        data = pd.read_csv(path + '/data/' + uploaded_file.name)
        print(list(data.columns))
        context['url'] = fs.url(name)
    return render(request, 'upload.html', context)


class DatasetDelete(DeleteView):
    model = Dataset
    success_url = reverse_lazy('dataset-list')
    template_name = 'dataset_confirm_delete.html'
