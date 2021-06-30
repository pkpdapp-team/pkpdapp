#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from django.urls import reverse
from pkpdapp.models import (
    MechanisticModel,
    Protocol, Variable
)


class PharmacodynamicModel(MechanisticModel):

    def get_absolute_url(self):
        return reverse('pd_model-detail', kwargs={'pk': self.pk})


class PdVariable(Variable):
    """
    variables for pk models
    """
    pd_model = models.ForeignKey(
        PharmacodynamicModel,
        on_delete=models.CASCADE,
        help_text='pharmacodynamic model'
    )

class PkpdModel(MechanisticModel):
    dose_compartment = models.CharField(
        max_length=100,
        default='central',
        help_text='compartment name to be dosed',
        blank=True, null=True,
    )
    protocol = models.ForeignKey(
        Protocol,
        on_delete=models.CASCADE,
        help_text='dosing protocol',
        blank=True, null=True,
    )

    def get_absolute_url(self):
        return reverse('pkpd_model-detail', kwargs={'pk': self.pk})
