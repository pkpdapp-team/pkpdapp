#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from django.core.cache import cache
from django.core.exceptions import ValidationError
import myokit
from myokit.formats.sbml import SBMLParser
from myokit.formats.mathml import MathMLExpressionWriter
import threading
from pkpdapp.models import MyokitModelMixin


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
        '<model id="default">'
        '</model>'
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

    def clean(self):
        try:
            self.create_myokit_model()
        except Exception as e:
            raise ValidationError({'sbml': str(e)})
