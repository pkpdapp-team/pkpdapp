#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models


class Tag(models.Model):
    """
    A tag for a model
    """

    name = models.CharField(max_length=20, help_text="name of the tag")
