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
    TemplateView
)
from pkpdapp.dash_apps.data_analysis_app import DataAnalysisApp
from dash.dependencies import Input, Output
import dash
from django.contrib.auth.mixins import LoginRequiredMixin


def create_data_analysis_app(project):
    datasets = []
    dataset_names = []
    for dataset in project.datasets.all():
        protocol = Protocol.objects.filter(dataset=dataset)
        if not protocol:
            continue
        biomarker_types = BiomarkerType.objects.filter(
            dataset=dataset,
        )
        biomarkers = Biomarker.objects\
            .select_related('biomarker_type__name')\
            .filter(biomarker_type__in=biomarker_types)

        # convert to pandas dataframe with the column names expected
        df_meas = pd.DataFrame(
            list(
                biomarkers.values('time', 'subject_id',
                                  'biomarker_type__name', 'value')
            )
        )
        doses = Dose.objects.filter(protocol__in=protocol)\
                    .select_related('protocol__subject_id')\
                    .select_related('protocol__compound__name')

        df_dose = pd.DataFrame(
            list(
                doses.values('start_time', 'protocol__subject_id',
                             'protocol__compound__name', 'amount')
            )
        )
        df_dose.rename(columns={
            'protocol__subject_id': 'subject_id',
        }, inplace=True)

        initial_doses = df_dose.sort_values(by='start_time')\
                               .groupby(['subject_id'])\
                               .first()\
                               .drop(columns='start_time')

        df = pd.merge(
            df_meas, initial_doses,
            how='inner', on=['subject_id']
        )

        df.rename(columns={
            'subject_id': 'ID',
            'time': 'Time',
            'protocol__compound__name': 'Compound',
            'value': 'Measurement',
            'biomarker_type__name': 'Biomarker',
            'amount': 'Amount'
        }, inplace=True)

        datasets.append(df)
        dataset_names.append(dataset.name)


    return DataAnalysisApp('data_analysis_view', datasets, dataset_names)


class DataAnalysis(TemplateView, LoginRequiredMixin):
    template_name = 'data_analysis.html'

    def get(self, request, *args, **kwargs):
        project = self.request.user.profile.selected_project
        self._data_analysis_app = create_data_analysis_app(project)
        return super().get(request)

