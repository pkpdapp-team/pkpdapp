#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from pkpdapp.models import (
    Compound
)

class EfficacyExperiment(models.Model):
    name = models.CharField(
        max_length=100, help_text='name of the experiment',
        blank=True, default=''
    )
    
    c50 = models.FloatField(
        help_text=(
            'half maximal effective concentration'
        )
    )

    c50_unit = models.ForeignKey(
        'Unit', on_delete=models.PROTECT,
        related_name='efficacy_experiments',
        help_text='unit for c50'
    )
    
    hill_coefficient = models.FloatField(
        default=1.0,
        help_text=(
            'Hill coefficient measure of binding'
        )
    )
    
    compound = models.ForeignKey(
        Compound, on_delete=models.CASCADE,
        related_name='efficacy_experiments',
        help_text='compound for efficacy experiment'
    )
 
