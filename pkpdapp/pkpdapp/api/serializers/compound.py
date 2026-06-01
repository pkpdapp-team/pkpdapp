#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from rest_framework import serializers
from pkpdapp.models import (
    Compound
)


class BaseCompoundSerializer(serializers.ModelSerializer):
    class Meta:
        model = Compound
        fields = '__all__'


class CompoundSerializer(serializers.ModelSerializer):

    class Meta:
        model = Compound
        fields = '__all__'

    def update(self, instance, validated_data):
        compound = BaseCompoundSerializer().update(
            instance, validated_data
        )
        compound.refresh_from_db()

        return compound
