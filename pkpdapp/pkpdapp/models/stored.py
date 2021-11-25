#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from django.db import models

class StoredModel(models.Model):
    read_only = models.BooleanField(
        default=False,
        help_text='true if object has been stored'
    )
    datetime = models.DateTimeField(
        help_text=(
            'datetime the object was stored.'
        ),
        null=True, blank=True
    )

    class Meta:
        abstract = True


