#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from pkpdapp.models import Protocol, StoredModel
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

    def is_same_as(self, other_dose):
        if self.duration != other_dose.duration:
            return False
        if self.start_time != other_dose.start_time:
            return False
        if self.amount != other_dose.amount:
            return False
        return True


class Dose(DoseBase, StoredModel):
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
            'read_only': True,
        }
        return Dose.objects.create(**stored_dose_kwargs)
