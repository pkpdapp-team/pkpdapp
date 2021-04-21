#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from pkpdapp.models import (
    Biomarker, BiomarkerType, Dose, Protocol
)
import pandas as pd
from django.views.generic import (
    TemplateView
)
from pkpdapp.dash_apps.data_analysis_app import DataAnalysisState
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

        # cannot JSON serialise int64
        df = df.astype({'ID': 'str'})

        datasets.append(df)
        dataset_names.append(dataset.name)

    state = DataAnalysisState()
    state.add_datasets(datasets, dataset_names)
    return state


class DataAnalysis(TemplateView, LoginRequiredMixin):
    template_name = 'data_analysis.html'

    def get(self, request, *args, **kwargs):
        project = self.request.user.profile.selected_project
        session = request.session
        session['django_plotly_dash'] = {
            'data_analysis_view': create_data_analysis_app(
                project
            ).to_json()
        }
        return super().get(request)
