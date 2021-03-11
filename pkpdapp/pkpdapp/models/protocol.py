#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from pkpdapp.models import Compound, Dataset


class Protocol(models.Model):
    """
    Multiple doses forming a single protocol. Can optionally be associated with a
    compound, dataset and subject.
    """
    name = models.CharField(
        max_length=100, help_text='name of the protocol'
    )
    compound = models.ForeignKey(
        Compound, on_delete=models.CASCADE,
        help_text='drug compound'
    )
    dataset = models.ForeignKey(
        Dataset, on_delete=models.CASCADE,
        blank=True, null=True,
        help_text='dataset containing this protocol'
    )
    subject_id = models.IntegerField(
        help_text='subject id',
        blank=True, null=True,
    )

    def get_absolute_url(self):
        return reverse('protocol-detail', kwargs={'pk': self.pk})


