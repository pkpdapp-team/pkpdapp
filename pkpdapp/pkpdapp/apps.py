#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.apps import AppConfig


class PkpdAppConfig(AppConfig):
    name = 'pkpdapp'

    def ready(self):
        from django.contrib.auth.models import User
        from .signals import add_profile_on_user_save
        from django.db.models.signals import post_save
        post_save.connect(add_profile_on_user_save, sender=User)
