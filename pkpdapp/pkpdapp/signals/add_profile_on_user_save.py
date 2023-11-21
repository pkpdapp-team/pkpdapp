#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from pkpdapp.models import Profile


def add_profile_on_user_save(sender, **kwargs):
    if kwargs['created']:
        Profile.objects.create(user=kwargs['instance']).save()
