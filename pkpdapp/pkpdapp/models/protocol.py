#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from django.urls import reverse
from pkpdapp.models import Compound, Dataset, Subject


class Protocol(models.Model):
    """
    Multiple doses forming a single protocol. Can optionally be associated with
    a compound, dataset and subject.
    """
    name = models.CharField(
        max_length=100, help_text='name of the protocol'
    )
    compound = models.ForeignKey(
        Compound, on_delete=models.CASCADE,
        blank=True, null=True,
        help_text='drug compound'
    )
    dataset = models.ForeignKey(
        Dataset, on_delete=models.CASCADE,
        blank=True, null=True,
        related_name='protocols',
        help_text='dataset containing this protocol'
    )
    subject = models.ForeignKey(
        Subject, on_delete=models.CASCADE,
        help_text='subject associated with protocol',
        blank=True, null=True,
    )

    class DoseType(models.TextChoices):
        DIRECT = 'D', 'IV'
        INDIRECT = 'I', 'Extravascular'

    dose_type = models.CharField(
        max_length=1,
        choices=DoseType.choices,
        default=DoseType.DIRECT,
    )

    def get_absolute_url(self):
        return reverse('protocol-detail', kwargs={'pk': self.pk})

    def __str__(self):
        return str(self.name)
