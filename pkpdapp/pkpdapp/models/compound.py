#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from pkpdapp.models import (
    Unit,
)


def get_mol_mass_unit():
    try:
        return Unit.objects.get(symbol='g/mol')
    except Unit.DoesNotExist:
        return None


class Compound(models.Model):
    """
    """

    name = models.CharField(
        max_length=100, help_text='name of the compound'
    )
    description = models.TextField(
        help_text='short description of the compound'
    )
    molecular_mass = models.FloatField(
        blank=True, null=True,
        help_text='molecular mass for compound for conversion from mol to grams'
    )
    molecular_mass_unit = models.ForeignKey(
        Unit, on_delete=models.PROTECT,
        default=get_mol_mass_unit,
        related_name='compounds',
        help_text='unit for molecular mass (e.g. g/mol)'
    )

    def __str__(self):
        return str(self.name)
