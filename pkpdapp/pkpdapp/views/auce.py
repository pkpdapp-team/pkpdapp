#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from pkpdapp.models import (
    Biomarker, BiomarkerType
)
import pandas as pd
from django.views.generic import (
    TemplateView
)
from pkpdapp.dash_apps.auce_app import AuceState
from django.contrib.auth.mixins import LoginRequiredMixin


def create_auce_app(project):
    datasets = []
    dataset_names = []
    for dataset in project.datasets.all():
        biomarker_types = BiomarkerType.objects.filter(
            dataset=dataset,
        )
        biomarkers = Biomarker.objects\
            .select_related('biomarker_type__name')\
            .filter(biomarker_type__in=biomarker_types)

        # convert to pandas dataframe with the column names expected
        df = pd.DataFrame(
            list(
                biomarkers.values('time',
                                  'subject__id_in_dataset',
                                  'subject__dose_group',
                                  'subject__group',
                                  'biomarker_type__name', 'value')
            )
        )

        df.rename(columns={
            'subject__id_in_dataset': 'ID',
            'subject__dose_group': 'DoseGroup',
            'subject__group': 'Group',
            'time': 'Time',
            'protocol__compound__name': 'Compound',
            'value': 'Measurement',
            'biomarker_type__name': 'Biomarker',
            'amount': 'Amount'
        }, inplace=True)

        # cannot JSON serialise int64
        # going to assume that dosegroup can be converted to float
        df = df.astype({'ID': 'str'})
        df['DoseGroup'] = pd.to_numeric(df['DoseGroup'], errors='coerce')

        datasets.append(df)
        dataset_names.append(dataset.name)

    state = AuceState()
    state.add_datasets(datasets, dataset_names)
    return state


class Auce(TemplateView, LoginRequiredMixin):
    template_name = 'auce.html'

    def get(self, request, *args, **kwargs):
        project = self.request.user.profile.selected_project
        session = request.session
        session['django_plotly_dash'] = {
            'auce_view': create_auce_app(
                project
            ).to_json()
        }

        return super().get(request)
