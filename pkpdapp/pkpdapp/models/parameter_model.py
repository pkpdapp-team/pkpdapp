#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from pkpdapp.pkpdapp.models import pkpd_model
from django.db import models
from django.core.cache import cache


class parameter(models.Model):

    SCALES = [
        'Linear',
        'Logarithmic',
        'Square root'
    ]

    name = models.CharField(max_length=30)
    min_value = models.FloatField()
    max_value = models.FloatField()
    value = models.FloatField()
    pk_model = models.CharField(max_length=100)
    pd_model=models.CharField(max_length=100)
    scale = models.CharField(max_length=20, choices=SCALES)
    unit = models.CharField(max_length=100)

    