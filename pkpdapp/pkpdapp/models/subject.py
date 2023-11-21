#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from jsonfield import JSONField


class Subject(models.Model):
    """
    A subject in a particular dataset.
    """
    id_in_dataset = models.IntegerField(help_text='unique id in the dataset')
    dataset = models.ForeignKey(
        'Dataset', on_delete=models.CASCADE,
        related_name='subjects',
        help_text='dataset containing this subject'
    )
    protocol = models.ForeignKey(
        'Protocol', on_delete=models.SET_NULL,
        related_name='subjects',
        blank=True, null=True,
        help_text='dosing protocol for this subject.'
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
        ]

    def __str__(self):
        return str(self.id_in_dataset)
