#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models


class AbstractUnit(models.Model):
    symbol = models.CharField(
        max_length=20,
        help_text='unit symbol (e.g. "mg")'
    )

    class Meta:
        abstract = True

    def __str__(self):
        return str(self.symbol)


class StandardUnit(AbstractUnit):
    """
    """


class Unit(AbstractUnit):
    """
    """
    standard_unit = models.ForeignKey(
        StandardUnit,
        on_delete=models.CASCADE,
        help_text='standard unit associated with this unit'
    )
    multiplier = models.FloatField(
        help_text='multiplier to convert to standard unit'
    )

    def to_standard_unit(self, measure):
        return measure * self.multiplier
