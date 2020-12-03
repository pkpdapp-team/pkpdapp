#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from pkpdapp.models import BiomarkerType, Dataset


class Biomarker(models.Model):
    """
    A biomarker measurement value for use in a dataset
    """
    time = models.DateTimeField()
    value = models.FloatField()
    biomarker_type = models.ForeignKey(
        BiomarkerType, on_delete=models.PROTECT
    )
    dataset = models.ForeignKey(
        Dataset, on_delete=models.CASCADE
    )
