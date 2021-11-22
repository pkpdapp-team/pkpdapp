#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from pkpdapp.models import Protocol, StoredProtocol
from django.core.exceptions import ValidationError


def validate_duration(value):
    if value <= 0:
        raise ValidationError(
            'Duration should be greater than 0'
        )

class DoseBase(models.Model):
    """
    A single dose event.
    """

    start_time = models.FloatField(
        help_text=(
            'starting time point of dose, '
            'see protocol for units'
        )
    )
    amount = models.FloatField(
        help_text=(
            'amount of compound administered over the duration, '
            'see protocol for units. Rate of administration is '
            'assumed constant'
        )
    )
    duration = models.FloatField(
        default=1.0,
        help_text=(
            'Duration of dose administration, '
            'see protocol for units. '
            'Duration must be greater than 0.'
        ),
        validators=[validate_duration]
    )

    class Meta:
        constraints = [
            models.CheckConstraint(
                name="Duration must be greater than 0",
                check=models.Q(duration__gt=0),
            ),
        ]

    def get_project(self):
        return self.protocol.get_project()

    def save(self, force_insert=False, force_update=False, *args, **kwargs):
        super().save(force_insert, force_update, *args, **kwargs)

        for dosed_pk_model in self.protocol.dosed_pk_models.all():
            dosed_pk_model.update_simulator()

class Dose(DoseBase):
    protocol = models.ForeignKey(
        Protocol, on_delete=models.CASCADE,
        related_name='doses',
        help_text='protocol containing this dose'
    )
    def create_stored_dose(self, stored_protocol):
        stored_dose_kwargs = {
            'protocol': stored_protocol,
            'start_time': self.start_time,
            'amount': self.amount,
            'duration': self.duration,
        }
        return StoredDose.objects.create(**stored_dose_kwargs)


class StoredDose(DoseBase):
    protocol = models.ForeignKey(
        StoredProtocol, on_delete=models.CASCADE,
        related_name='stored_doses',
        help_text='protocol containing this dose'
    )

