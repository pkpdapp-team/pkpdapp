#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from django.contrib.auth.models import User
from django.urls import reverse
from pkpdapp.models import (
    Dataset, PharmacodynamicModel,
    DosedPharmacokineticModel, Protocol
)


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
    datasets = models.ManyToManyField(
        Dataset,
        blank=True,
        help_text='datasets referenced by this project'
    )
    pk_models = models.ManyToManyField(
        DosedPharmacokineticModel,
        blank=True,
        help_text='PK models referenced by this project'
    )
    pd_models = models.ManyToManyField(
        PharmacodynamicModel,
        blank=True,
        help_text='PD models referenced by this project'
    )
    protocols = models.ManyToManyField(
        Protocol,
        blank=True,
        help_text='Protocols referenced by this project'
    )
    users = models.ManyToManyField(
        User,
        help_text='users with access to this project'
    )

    def get_absolute_url(self):
        return reverse('project-detail', kwargs={'pk': self.pk})

    def __str__(self):
        return str(self.name)


