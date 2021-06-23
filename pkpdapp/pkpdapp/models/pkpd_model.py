#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from django.urls import reverse
from pkpdapp.models import (
    Protocol
)


class MechanisticModel(models.Model):
    """
    A PK or PD model, represented using SBML
    """
    DEFAULT_SBML = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<sbml '
        'xmlns="http://www.sbml.org/sbml/level3/version2/core" '
        'level="3" version="2"'
        '>'
        '</sbml>'
    )

    name = models.CharField(max_length=100, help_text='name of the model')
    description = models.TextField(
        help_text='short description of the model',
        blank=True, default=''
    )
    sbml = models.TextField(
        help_text='the model represented using SBML (see http://sbml.org)',
        default=DEFAULT_SBML,
    )
    time_max = models.FloatField(
        default=30,
        help_text=(
            'suggested maximum time to simulate for this model (in the time '
            'units specified by the sbml model)'
        )
    )

    class Meta:
        abstract = True

    def __str__(self):
        return str(self.name)


class PharmacokineticModel(MechanisticModel):
    """
    this just creates a concrete table for PK models without dosing
    """

    def get_absolute_url(self):
        return reverse('pk_model-detail', kwargs={'pk': self.pk})


class DosedPharmacokineticModel(models.Model):
    """
    PK model plus dosing and protocol information
    """
    DEFAULT_PK_MODEL = 1
    name = models.CharField(max_length=100, help_text='name of the model')
    pharmacokinetic_model = models.ForeignKey(
        PharmacokineticModel,
        default=DEFAULT_PK_MODEL,
        on_delete=models.CASCADE,
        help_text='pharmacokinetic model'
    )
    dose_compartment = models.CharField(
        max_length=100,
        default='central',
        blank=True, null=True,
        help_text='compartment name to be dosed'
    )
    protocol = models.ForeignKey(
        Protocol,
        on_delete=models.CASCADE,
        blank=True, null=True,
        help_text='dosing protocol'
    )
    time_max = models.FloatField(
        default=30,
        help_text=(
            'suggested time to simulate after the last dose (in the time '
            'units specified by the sbml model)'
        )
    )

    def get_absolute_url(self):
        return reverse('dosed_pk_model-detail', kwargs={'pk': self.pk})


class PharmacodynamicModel(MechanisticModel):

    def get_absolute_url(self):
        return reverse('pd_model-detail', kwargs={'pk': self.pk})


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
