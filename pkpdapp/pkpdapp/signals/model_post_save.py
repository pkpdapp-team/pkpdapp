#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db.models.signals import post_save
from django.dispatch import receiver
from pkpdapp.models import (
    PharmacodynamicModel,
    DosedPharmacokineticModel
)


@receiver(post_save, sender=PharmacodynamicModel)
def pd_post_save(sender, instance, **kwargs):
    instance.update_model()


@receiver(post_save, sender=DosedPharmacokineticModel)
def pk_post_save(sender, instance, **kwargs):
    instance.update_model()
