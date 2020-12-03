#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models


class Dataset(models.Model):
    """
    A dataset
    """
    ADMINISTRATION_TYPE_CHOICES = [
        ('T1', 'type1'),
        ('T2', 'type2'),
    ]
    name = models.CharField(max_length=100)
    description = models.TextField()
    administration_type = models.CharField(
        max_length=2, choices=ADMINISTRATION_TYPE_CHOICES
    )
