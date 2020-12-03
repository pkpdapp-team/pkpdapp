#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models


class PkpdModel(models.Model):
    """
    A PK or PD model, represented using SBML
    """
    MODEL_TYPE_CHOICES = [
        ('PK', 'Pharmokinetic'),
        ('PD', 'Pharmodynamic'),
    ]
    name = models.CharField(max_length=100)
    description = models.TextField()
    model_type = models.CharField(
        max_length=2, choices=MODEL_TYPE_CHOICES
    )
    sbml = models.TextField()
