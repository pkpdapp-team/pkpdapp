#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from django.views.generic import DetailView
from pkpdapp.models import Dataset, Biomarker, BiomarkerType


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
