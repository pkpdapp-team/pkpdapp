#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from pkpdapp.models import Dataset, PkpdModel
from django.contrib.auth.models import User


class Project(models.Model):
    """
    A project, containing multiple datasets, models and users
    """
    name = models.CharField(max_length=100)
    description = models.TextField()
    datasets = models.ManyToManyField(Dataset)
    pkpd_models = models.ManyToManyField(PkpdModel)
    users = models.ManyToManyField(User)
