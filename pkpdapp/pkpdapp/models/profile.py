#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from pkpdapp.models import Project
from django.contrib.auth.models import User


class Profile(models.Model):
    """
    A user profile, containing neccessary information for users not held in
    :model:`auth.User`.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    selected_project = models.ForeignKey(
        Project,
        help_text='currently selected project for user',
        null=True, on_delete=models.SET_NULL
    )
