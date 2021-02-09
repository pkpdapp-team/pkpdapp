#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from django.urls import reverse


class PkpdModel(models.Model):
    """
    A PK or PD model, represented using SBML
    """
    MODEL_TYPE_CHOICES = [
        ('PK', 'Pharmokinetic'),
        ('PD', 'Pharmodynamic'),
    ]
    name = models.CharField(max_length=100, help_text='name of the model')
    description = models.TextField(help_text='short description of the model')
    model_type = models.CharField(
        max_length=2, choices=MODEL_TYPE_CHOICES,
        help_text='type of model, e.g. PK or PD'

    )
    sbml = models.TextField(
        help_text='the model represented using SBML (see http://sbml.org)'
    )

    def get_absolute_url(self):
        return reverse('pkpd_model-detail', kwargs={'pk': self.pk})
