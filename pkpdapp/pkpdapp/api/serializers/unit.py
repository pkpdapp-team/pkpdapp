#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from pkpdapp.models import Unit
from rest_framework.schemas.openapi import AutoSchema
from rest_framework import serializers
import logging

logger = logging.getLogger(__name__)


class UnitSchema(AutoSchema):
    """
    AutoSchema subclass that knows how to use extra_info.
    """

    ...


class UnitSerializer(serializers.ModelSerializer):
    # Note: compatible units and their conversion factors are now computed on
    # the frontend (see frontend-v2/src/shared/unitConversion.ts) from the unit
    # exponents/multiplier plus the project compound's molecular masses.
    class Meta:
        model = Unit
        fields = "__all__"
