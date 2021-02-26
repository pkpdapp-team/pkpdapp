#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from django.urls import reverse


class MechanisticModel(models.Model):
    """
    A PK or PD model, represented using SBML
    """

    name = models.CharField(max_length=100, help_text='name of the model')
    description = models.TextField(
        help_text='short description of the model',
        blank=True, default=''
    )
    model_type = models.CharField(
        max_length=2, choices=MODEL_TYPE_CHOICES,
        help_text='type of model, e.g. PK or PD'

    )
    sbml = models.TextField(
        help_text='the model represented using SBML (see http://sbml.org)'
    )

    class Meta:
        abstract = True

class PharmokineticModel(MechanisticModel):
    """
    this just creates a concrete table for PK models without dosing
    """

    def get_absolute_url(self):
        return reverse('pharmacokinetic_model-detail', kwargs={'pk': self.pk})

class DosedPharmokineticModel(MechanisticModel):
    """
    PK model plus dosing and protocol information
    """
    dose_compartment = models.CharField(
        max_length=100,
        help_text='compartment name to be dosed'
    )
    direct_dose = models.BooleanField(
        default=True,
        help_text=(
            'True if drug is administered directly into the dosing '
            'compartment'
        ),
    )
    dose_amount = models.FloatField(
        default=0.0,
        help_text=(
            'The amount of the compound that is injected at each '
            'administration.'
        ),
    )
    dose_start = models.FloatField(
        default=0.0,
        help_text='Start time of the treatment.',
    )
    dose_duration = models.FloatField(
        default=0.01,
        help_text='''
            Duration of dose administration. For a bolus injection, a dose
            duration of 1% of the time unit should suffice. By default the
            duration is set to 0.01 (bolus).
        '''
    )
    dose_period = models.FloatField(
        blank=True,
        help_text='''
            Periodicity at which doses are administered. If empty the dose
            is administered only once.
        '''
    )
    number_of_doses = models.IntegerField(
        blank=True,
        help_text='''
            Number of administered doses. If empty and the periodicity of
            the administration is not empty, doses are administered
            indefinitely.
        '''
    )

    def get_absolute_url(self):
        return reverse('dosed_pk_model-detail', kwargs={'pk': self.pk})


class PharmacodynamicModel(MechanisticModel):

    def get_absolute_url(self):
        return reverse('pd_model-detail', kwargs={'pk': self.pk})

    def __str__(self):
        return str(self.name)
