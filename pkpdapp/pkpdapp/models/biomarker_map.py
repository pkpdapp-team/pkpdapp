#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from pkpdapp.models import BiomarkerType, Dataset


class BiomarkerMap(models.Model):
    """
    A biomarker type associated with a particular dataset, e.g. "Tumour volume".  Each
    :model:`pkpdapp.BiomarkerMap` is classified with a particular entry in
    :model:`pkpdapp.BiomarkerType`, e.g. "Tumour volume" is a "volume in cm^3". This
    would correspond with a particular column in a dataset. Each
    """
    name = models.CharField(
        max_length=100,
        help_text='name of the biomarker for a particular dataset',
    )
    description = models.TextField(
        help_text='description of the biomarker for a particular dataset',
    )
    biomarker_type = models.ForeignKey(
        BiomarkerType, on_delete=models.PROTECT,
        help_text='biomarker type, for example "concentration in mg"'
    )
    dataset = models.ForeignKey(
        Dataset, on_delete=models.CASCADE,
        help_text='dataset containing this biomarker measurement'
    )
