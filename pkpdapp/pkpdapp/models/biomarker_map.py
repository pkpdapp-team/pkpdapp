#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from pkpdapp.models import BiomarkerType, Dataset


class BiomarkerMap(models.Model):
    """
    This model contains additional information about a biomarker type within a
    particular dataset, e.g. "Tumour volume", rather than a generic "volume"
    biomarker type. This would correspond with a particular column in a
    dataset.
    """
    name = models.CharField(
        max_length=100,
        help_text='name of the biomarker for a particular dataset',
    )
    description = models.TextField(
        help_text='description of the biomarker for a particular dataset',
    )
    biomarker_type = models.ForeignKey(
        BiomarkerType, on_delete=models.CASCADE,
        help_text='biomarker type, for example "concentration in mg"'
    )
    dataset = models.ForeignKey(
        Dataset, on_delete=models.CASCADE,
        help_text='dataset containing this biomarker measurement'
    )
