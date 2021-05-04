#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from django.shortcuts import render
from django.urls import reverse_lazy
from django.core.paginator import Paginator
from pkpdapp.models import (
    Dataset, Biomarker, BiomarkerType, Protocol, Subject
)
from ..forms import CreateNewDataset, UpdateBiomarkerType
from pkpdapp.dash_apps.data_view import DataViewState
import pandas as pd
from django.forms import formset_factory
from django.shortcuts import redirect
from django.views.generic import (
    DetailView, CreateView,
    UpdateView, DeleteView,
    ListView
)


BASE_FILE_UPLOAD_ERROR = 'FILE UPLOAD FAILED: '


def create_data_view_state(dataset):
    state = DataViewState()

    # add datasets
    biomarker_types = BiomarkerType.objects.filter(dataset=dataset)
    biomarkers = Biomarker.objects\
        .filter(biomarker_type__in=biomarker_types)

    if biomarkers:
        biomarker_units = {
            b['name']: b['unit__symbol']
            for b in biomarker_types.values(
                'name', 'unit__symbol'
            )
        }
        # convert to pandas dataframe with the column names expected
        df = pd.DataFrame(
            list(
                biomarkers.values('time', 'subject_id',
                                  'biomarker_type__name', 'value')))
        df.rename(columns={
            'subject_id': 'ID',
            'time': 'Time',
            'biomarker_type__name': 'Biomarker',
            'value': 'Measurement'
        }, inplace=True)

        state.add_data(df, dataset.name, biomarker_units, use=True)

    return state


class DatasetDetailView(DetailView):
    model = Dataset
    paginate_by = 20
    template_name = 'dataset_detail.html'

    def get(self, request, *args, **kwargs):
        dataset = self.get_object()
        session = request.session
        session['django_plotly_dash'] = {
            'data_view': create_data_view_state(dataset).to_json()
        }
        return super().get(request)

    def get_context_data(self, **kwargs):
        # Call the base implementation first to get a context
        context = super().get_context_data(**kwargs)

        context['biomarker_types'] = BiomarkerType.objects.filter(
            dataset=context['dataset']
        )

        context['dose_groups'] = Subject.objects.filter(
            dataset=context['dataset']
        ).order_by('dose_group').values('dose_group').distinct()\
            .exclude(dose_group='')

        context['subject_groups'] = Subject.objects.filter(
            dataset=context['dataset']
        ).order_by('group').values('group').distinct().exclude(dose_group='')

        protocol = Protocol.objects.filter(dataset=context['dataset'])
        context['has_protocol'] = len(protocol) > 0

        context['protocols'] = self.get_paginated_protocols(context)
        context['page_obj'] = context['protocols']
        return context

    def get_paginated_protocols(self, context):
        queryset = Protocol.objects.filter(
            dataset=context['dataset']
        ).order_by('subject_id')
        paginator = Paginator(queryset, self.paginate_by)
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
        UpdateBiomarkerType,
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
            for f in formset:
                cd = f.cleaned_data
                unit = cd.get("other_unit")
                desc = cd.get("description")
                if unit is not None:
                    biomarkertypes[k].unit = unit.standard_unit
                if desc is not None:
                    biomarkertypes[k].description = desc
                biomarkertypes[k].save()
                k += 1
        return redirect(reverse_lazy(
            'dataset-detail',
            kwargs={'pk': pk}
        ))
    else:
        formset = BiomarkerFormset()
        context["formset"] = formset
    return render(request, 'biomarker_update.html',
                  context)
