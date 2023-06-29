#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from typing import Dict, List
import myokit
from rest_framework import serializers
from rest_framework.schemas.openapi import AutoSchema
from pkpdapp.models import (
    Unit
)


class UnitSchema(AutoSchema):
    """
    AutoSchema subclass that knows how to use extra_info.
    """
    ...


class UnitSerializer(serializers.ModelSerializer):
    compatible_units = \
        serializers.SerializerMethodField('get_compatible_units')

    class Meta:
        model = Unit
        fields = '__all__'

    def get_compatible_units(self, unit) -> List[Dict[str, str]]:
        myokit_unit = unit.get_myokit_unit()
        return [
            {
                'id': u.id,
                'symbol': u.symbol,
                'conversion_factor': unit.convert_to(u),
            } for u in unit.get_compatible_units()
        ]
