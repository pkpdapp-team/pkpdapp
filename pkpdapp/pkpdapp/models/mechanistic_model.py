#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from django.urls import reverse
from django.core.cache import cache
import myokit
from myokit.formats.sbml import SBMLParser

class MyokitModelMixin:
    def _get_myokit_model_cache_key(self):
        return  'myokit_model_{}_{}'.format(
            self._meta.db_table, self.id
        )

    def _get_myokit_simulator_cache_key(self):
        return  'myokit_simulator_{}_{}'.format(
            self._meta.db_table, self.id
        )

    def create_myokit_model(self):
        return SBMLParser().parse_string(
            str.encode(self.sbml)
        ).myokit_model()

    def create_myokit_simulator(self):
        return myokit.Simulation(self.get_myokit_model())

    def get_myokit_simulator(self):
        key = self._get_myokit_simulator_cache_key()
        myokit_simulator = cache.get(key)
        if myokit_simulator is None:
            myokit_simulator = self.create_myokit_simulator()
            cache.set(
                key, myokit_simulator, timeout=None
            )
        return myokit_simulator

    def get_myokit_model(self):
        key = self._get_myokit_model_cache_key()
        myokit_model = cache.get(key)
        if myokit_model is None:
            myokit_model = self.create_myokit_model()
            cache.set(
                key, myokit_model, timeout=None
            )
        return myokit_model

    def save(self, *args, **kwargs):
        cache.delete(self._get_cache_key())
        super().save(*args, **kwargs)


class MechanisticModel(models.Model, MyokitModelMixin):
    """
    A PK or PD model, represented using SBML
    """
    DEFAULT_SBML = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<sbml '
        'xmlns="http://www.sbml.org/sbml/level3/version2/core" '
        'level="3" version="2"'
        '>'
        '</sbml>'
    )

    name = models.CharField(max_length=100, help_text='name of the model')
    description = models.TextField(
        help_text='short description of the model',
        blank=True, default=''
    )
    sbml = models.TextField(
        help_text='the model represented using SBML (see http://sbml.org)',
        default=DEFAULT_SBML,
    )
    time_max = models.FloatField(
        default=30,
        help_text=(
            'suggested maximum time to simulate for this model (in the time '
            'units specified by the sbml model)'
        )
    )

    class Meta:
        abstract = True

    def __str__(self):
        return str(self.name)
