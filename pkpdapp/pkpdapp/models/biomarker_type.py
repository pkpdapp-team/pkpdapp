#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models


class BiomarkerType(models.Model):
    """
    A generic (not associated with a particular dataset) biomarker type, for example
    "concentration in mg", or "volume in cm^3".
    """

    UNIT_CHOICES = [
        ('mg', 'mg'),
        ('g', 'g'),
        ('cm3', 'cm^3'),
    ]
    name = models.CharField(
        max_length=100, help_text='name of the biomarker type'
    )
    unit = models.CharField(
        max_length=3, choices=UNIT_CHOICES,
        help_text='units for the value stored in :model:`pkpdapp.Biomarker`'
    )
    description = models.TextField(
        help_text='short description of the biomarker type'
    )
