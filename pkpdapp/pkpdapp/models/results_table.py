#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models


class ResultsTable(models.Model):
    """
    A table of results for a single model.
    """

    name = models.CharField(
        max_length=100, help_text='name of the table'
    )

    class Type(models.TextChoices):
        PARAMETERS = 'parameters', 'Secondary parameters of the model.'
        VARIABLES = 'variables', 'Model variables.'
        GROUPS = 'groups', 'Subject groups.'
        INTERVALS = 'intervals', 'Time intervals.'

    rows = models.CharField(
        max_length=20,
        choices=Type.choices,
        help_text='parameter to display as table rows'
    )

    columns = models.CharField(
        max_length=20,
        choices=Type.choices,
        help_text='parameter to display as table columns'
    )

    filters: models.JSONField = models.JSONField(
        blank=True, null=True,
        help_text='Filters to apply to the table.'
    )

    project = models.ForeignKey(
        'Project', on_delete=models.CASCADE,
        related_name='results',
        blank=True, null=True,
        help_text='Project that this table belongs to.'
    )

    def __str__(self):
        return self.name
