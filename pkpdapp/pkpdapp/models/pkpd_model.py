#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from django.urls import reverse
from pkpdapp.models import (
    MechanisticModel,
    Protocol,
    Project,
)


class PharmacodynamicModel(MechanisticModel):
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE,
        related_name='pd_models',
        blank=True, null=True,
        help_text='Project that "owns" this model'
    )
    __original_sbml = None

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.__original_sbml = self.sbml

    def get_absolute_url(self):
        return reverse('pd_model-detail', kwargs={'pk': self.pk})

    def get_project(self):
        return self.project

    def save(self, force_insert=False, force_update=False, *args, **kwargs):
        created = not self.pk

        super().save(force_insert, force_update, *args, **kwargs)

        if created or self.sbml != self.__original_sbml:
            self.update_model()

        self.__original_sbml = self.sbml


class StoredPharmacodynamicModel(PharmacodynamicModel):
    """
    Stored PD model.
    """


class PkpdModel(MechanisticModel):
    dose_compartment = models.CharField(
        max_length=100,
        default='central',
        help_text='compartment name to be dosed',
        blank=True, null=True,
    )
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE,
        related_name='pkpd_models',
        blank=True, null=True,
        help_text='Project that "owns" this model'
    )
    protocol = models.ForeignKey(
        Protocol,
        on_delete=models.CASCADE,
        help_text='dosing protocol',
        blank=True, null=True,
    )

    def get_project(self):
        return self.project

    def get_absolute_url(self):
        return reverse('pkpd_model-detail', kwargs={'pk': self.pk})


class StoredPkpdModel(PharmacodynamicModel):
    """
    Stored PKPD model.
    """
