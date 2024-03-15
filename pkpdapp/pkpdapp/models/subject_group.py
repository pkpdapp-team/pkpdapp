#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models


class SubjectGroup(models.Model):
    """
    Multiple subjects forming a single group or cohort.
    """

    name = models.CharField(
        max_length=100, help_text='name of the group'
    )

    def __str__(self):
        return self.name
