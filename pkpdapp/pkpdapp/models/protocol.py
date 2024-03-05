#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from django.urls import reverse
from pkpdapp.models import (
    Compound, Unit,
    Project, StoredModel,
)


def get_h_unit():
    try:
        return Unit.objects.get(symbol='h')
    except Unit.DoesNotExist:
        return None


def get_mg_unit():
    try:
        return Unit.objects.get(symbol='mg')
    except Unit.DoesNotExist:
        return None


class Protocol(StoredModel):
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
        Compound, on_delete=models.PROTECT,
        blank=True, null=True,
        help_text='drug compound'
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
        Unit, on_delete=models.PROTECT,
        blank=True, null=True,
        default=get_h_unit,
        related_name='protocols_time',
        help_text=(
            'unit for the start_time and duration values stored in each dose'
        )
    )

    amount_unit = models.ForeignKey(
        Unit, on_delete=models.PROTECT,
        default=get_mg_unit,
        blank=True, null=True,
        related_name='protocols_amount',
        help_text='unit for the amount value stored in each dose'
    )

    mapped_qname = models.CharField(
        default='',
        max_length=50,
        help_text='qname of the mapped dosing compartment for each dose'
    )

    __original_dose_type = None

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.__original_dose_type = self.dose_type

    def get_absolute_url(self):
        return reverse('protocol-detail', kwargs={'pk': self.pk})

    def get_project(self):
        if self.project:
            return self.project
        else:
            subject = self.subjects.first()
            if subject is not None:
                return subject.get_project()

        return None

    def __str__(self):
        return str(self.name)

    def get_dataset(self):
        all_datasets = self.subjects.values('dataset').distinct()
        if all_datasets:
            return all_datasets[0]['dataset']
        return None

    def is_same_as(self, protocol):
        if self.project != protocol.project:
            return False
        if self.compound != protocol.compound:
            return False
        if self.dose_type != protocol.dose_type:
            return False
        if self.time_unit != protocol.time_unit:
            return False
        if self.time_unit != protocol.time_unit:
            return False
        if self.amount_unit != protocol.amount_unit:
            return False

        my_doses = self.doses.order_by('start_time')
        other_doses = protocol.doses.order_by('start_time')
        for my_dose, other_dose in zip(my_doses, other_doses):
            if not my_dose.is_same_as(other_dose):
                return False
        return True

    def save(self, force_insert=False, force_update=False, *args, **kwargs):
        super().save(force_insert, force_update, *args, **kwargs)

        if self.dose_type != self.__original_dose_type:
            for dosed_pk_model in self.dosed_pk_models.all():
                dosed_pk_model.update_model()

        self.__original_dose_type = self.dose_type

    def copy(self, new_project):
        stored_protocol_kwargs = {
            'name': self.name,
            'project': new_project,
            'compound': self.compound,
            'dose_type': self.dose_type,
            'time_unit': self.time_unit,
            'amount_unit': self.amount_unit,
        }
        stored_protocol = Protocol.objects.create(**stored_protocol_kwargs)
        for dose in self.doses.all():
            dose.copy(stored_protocol)
        return stored_protocol
