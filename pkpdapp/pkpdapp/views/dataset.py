#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from django.shortcuts import render
from django.urls import reverse_lazy
from django.core.paginator import Paginator
from pkpdapp.models import (
    Dataset, Biomarker, BiomarkerType, Dose, Protocol
)
from ..forms import CreateNewDataset, CreateNewBiomarkerUnit
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
from dash.dependencies import Input, Output
import dash


BASE_FILE_UPLOAD_ERROR = 'FILE UPLOAD FAILED: '


def create_visualisation_app(dataset):
    # create dash app
    app = PDSimulationApp(name='dataset_view')

    # add datasets
    biomarker_types = BiomarkerType.objects.filter(dataset=dataset)
    biomarkers = Biomarker.objects\
        .filter(biomarker_type__in=biomarker_types)

    if biomarkers:
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

        app.add_data(df, dataset.name, use=True)

    # generate dash app
    app.set_layout()

    # we need slider ids for callback, count the number of parameters for
    # each model so we know what parameter in the list corresponds to which
    # model
    sliders = app.slider_ids()
    n_params = [len(s) for s in sliders]
    offsets = [0]
    for i in range(1, len(n_params)):
        offsets.append(offsets[i - 1] + n_params[i])

    # Define simulation callbacks
    @app.app.callback(
        Output('fig', 'figure'),
        [Input('biomarker-select', 'value')])
    def update_simulation(*args):
        """
        if the models, datasets or biomarkers are
        changed then regenerate the figure entirely

        if a slider is moved, determine the relevent model based on the id
        name, then update that particular simulation
        """
        ctx = dash.callback_context
        cid = None
        if ctx.triggered:
            cid = ctx.triggered[0]['prop_id'].split('.')[0]
        print('ARGS', args)

        if cid == 'biomarker-select':
            app.set_used_biomarker(args[-1])
            return app.create_figure()

        return app._fig._fig

    return app


class DatasetDetailView(DetailView):
    model = Dataset
    paginate_by = 20
    template_name = 'dataset_detail.html'

    def get(self, request, *args, **kwargs):
        dataset = self.get_object()
        self._visualisation_app = create_visualisation_app(dataset)
        return super().get(request)

    def get_context_data(self, **kwargs):
        # Call the base implementation first to get a context
        context = super().get_context_data(**kwargs)
        # Add in a QuerySet of all the books

        context['biomarker_types'] = BiomarkerType.objects.filter(
            dataset=context['dataset']
        )
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
