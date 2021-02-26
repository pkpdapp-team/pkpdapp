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
    description = models.TextField(help_text='short description of the model')
    sbml = models.TextField(
        help_text='the model represented using SBML (see http://sbml.org)'
    )

    class Meta:
        abstract = True

class PharmokineticModel(MechanisticModel):

    def get_absolute_url(self):
        return reverse('pharmacokinetic_model-detail', kwargs={'pk': self.pk})

class PharmacodynamicModel(MechanisticModel):

    def get_absolute_url(self):
        return reverse('pharmacodynamic_model-detail', kwargs={'pk': self.pk})
