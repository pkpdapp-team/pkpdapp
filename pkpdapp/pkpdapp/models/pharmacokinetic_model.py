#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.urls import reverse
from pkpdapp.models import (
    MechanisticModel,
    StoredModel,
)


class PharmacokineticModel(MechanisticModel, StoredModel):
    """
    this just creates a concrete table for PK models without dosing
    """
    __original_mmt = None

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.__original_mmt = self.mmt

    def get_project(self):
        return None

    def get_absolute_url(self):
        return reverse('pk_model-detail', kwargs={'pk': self.pk})

    def save(self, force_insert=False, force_update=False, *args, **kwargs):
        created = not self.pk

        super().save(force_insert, force_update, *args, **kwargs)

        # don't update a stored model
        if self.read_only:
            return

        if created or self.mmt != self.__original_mmt:
            self.update_model()

        self.__original_mmt = self.mmt

    def create_stored_model(self):
        stored_model_kwargs = {
            'name': self.name,
            'description': self.description,
            'mmt': self.mmt,
            'time_max': self.time_max,
            'read_only': True,
        }
        stored_model = PharmacokineticModel.objects.create(
            **stored_model_kwargs)

        # no need to store variables as they will be stored with the dosed pk
        # model
        return stored_model
