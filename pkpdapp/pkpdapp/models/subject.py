#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from jsonfield import JSONField
from pkpdapp.models import Dataset, Unit
from django.db.models import Q


class SubjectGroup(models.Model):
    name = models.CharField(
        max_length=100,
        help_text='group name'
    )
    dataset = models.ForeignKey(
        Dataset, on_delete=models.CASCADE,
        related_name='subject_groups',
        help_text='dataset containing this subject'
    )

    class Meta:
        models.UniqueConstraint(fields=['name', 'dataset'], name='unique_name')


class Subject(models.Model):
    """
    A subject in a particular dataset.
    """
    id_in_dataset = models.IntegerField(help_text='unique id in the dataset')
    dataset = models.ForeignKey(
        Dataset, on_delete=models.CASCADE,
        related_name='subjects',
        help_text='dataset containing this subject'
    )
    dose_group_amount = models.FloatField(
        help_text='dosing amount for this subject (for constant dosing)',
        blank=True, null=True,
    )
    dose_group_unit = models.ForeignKey(
        Unit, on_delete=models.SET_NULL,
        blank=True, null=True,
        help_text=(
            'unit for dose_group_amount'
        )
    )
    protocol = models.ForeignKey(
        'Protocol', on_delete=models.SET_NULL,
        related_name='subjects',
        blank=True, null=True,
        help_text='dosing protocol for this subject.'
    )
    groups = models.ManyToManyField(
        SubjectGroup,
        related_name='subjects',
        help_text='groups this subject belongs to'
    )
    shape = models.IntegerField(
        default=0,
        help_text=(
            'Shape index associated with this subject. '
            'For plotting purposes in the frontend'
        )
    )
    display = models.BooleanField(
        default=True,
        help_text=(
            'True if this subject will be displayed in the '
            'frontend, False otherwise'
        )
    )
    metadata = JSONField(
        default=dict,
        help_text='subject metadata',
    )

    def get_project(self):
        return self.dataset.get_project()

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['id_in_dataset', 'dataset'],
                                    name='subject_dataset_unique'),
            models.CheckConstraint(
                check=(
                    (Q(dose_group_unit__isnull=True) &
                        Q(dose_group_unit__isnull=True)) |
                    (Q(dose_group_unit__isnull=False) &
                        Q(dose_group_unit__isnull=False))
                ),
                name='amount must have a unit and visa versa'
            )
        ]

    def __str__(self):
        return str(self.id_in_dataset)
