#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from pkpdapp.models import Unit
from django.db.models import Q


class Variable(models.Model):
    """
    A single variable for a mechanistic model.
    """

    name = models.CharField(max_length=20, help_text='name of the variable')
    unit = models.ForeignKey(
        Unit, on_delete=models.CASCADE,
        help_text=(
            'variable values are in this unit'
        )
    )
    lower_bound = models.FloatField(
        default=1e-6,
        help_text='lowest possible value for this variable'
    )
    upper_bound = models.FloatField(
        default=2,
        help_text='largest possible value for this variable'
    )
    default_value = models.FloatField(
        default=1,
        help_text='default value for this variable'
    )

    class Scale(models.TextChoices):
        LINEAR = 'LN', 'Linear'
        LOG = 'LG', 'Log'

    scale = models.CharField(
        max_length=2,
        choices=Scale.choices,
        default=Scale.LN,
    )

    class Meta:
        abstract = True
        constraints = [
            models.CheckConstraint(
                check=(
                    (Q(scale='LG') & Q(lower_bound__gt=0)) |
                    Q(scale='LN')
                ),
                name='log scale must have a lower bound greater than zero'
            )
        ]
