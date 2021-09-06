#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from django.contrib.auth.models import User
from django.urls import reverse


class Project(models.Model):
    """
    A project, containing multiple :model:`pkpdapp.Dataset`,
    :model:`pkpdapp.PkpdModel` and users.
    """
    name = models.CharField(max_length=100, help_text='name of the project')
    description = models.TextField(
        help_text='short description of the project',
        blank=True, default=''
    )
    users = models.ManyToManyField(
        User,
        help_text='users with access to this project'
    )

    def get_absolute_url(self):
        return reverse('project-detail', kwargs={'pk': self.pk})

    def __str__(self):
        return str(self.name)
