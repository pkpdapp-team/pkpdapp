#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import serializers
from pkpdapp.models import (
    Unit
)

class UnitSerializer(serializers.ModelSerializer):
    compatible_units = \
        serializers.SerializerMethodField('get_compatible_units')

    class Meta:
        model = Unit
        fields = '__all__'

    def get_compatible_units(self, unit):
        return [
            {
                'id': u.id,
                'symbol': u.symbol,
            } for u in unit.get_compatible_units()
        ]


