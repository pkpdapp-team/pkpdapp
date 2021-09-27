#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from django.urls import reverse
from pkpdapp.models import (
    Compound, Dataset, Subject, Unit,
    Project,
)


def get_h_unit():
    return Unit.objects.get(symbol='h'),


def get_mg_unit():
    return Unit.objects.get(symbol='mg'),


class Protocol(models.Model):
    """
    Multiple doses forming a single protocol. Can optionally be associated with
    a compound, dataset and subject.
    """

    name = models.CharField(
        max_length=100, help_text='name of the protocol'
    )
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE,
        related_name='protocols',
        blank=True, null=True,
        help_text='Project that "owns" this protocol.'
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

    time_unit = models.ForeignKey(
        Unit, on_delete=models.CASCADE,
        default=get_h_unit,
        related_name='protocols_time',
        help_text=(
            'unit for the start_time and duration values stored in each dose'
        )
    )

    amount_unit = models.ForeignKey(
        Unit, on_delete=models.CASCADE,
        default=get_mg_unit,
        related_name='protocols_amount',
        help_text='unit for the amount value stored in each dose'
    )

    __original_dose_type = None

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.__original_dose_type = self.dose_type

    def get_absolute_url(self):
        return reverse('protocol-detail', kwargs={'pk': self.pk})

    def __str__(self):
        return str(self.name)

    def save(self, force_insert=False, force_update=False, *args, **kwargs):
        super().save(force_insert, force_update, *args, **kwargs)

        if self.dose_type != self.__original_dose_type:
            for dosed_pk_model in self.dosed_pk_models.all():
                dosed_pk_model.update_model()

        self.__original_dose_type = self.dose_type
