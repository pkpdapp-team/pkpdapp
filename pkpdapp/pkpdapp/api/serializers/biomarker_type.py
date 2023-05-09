#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from typing import Dict, List
from rest_framework import serializers
from pkpdapp.models import (
    BiomarkerType
)


class BiomarkerTypeSerializer(serializers.ModelSerializer):
    data = serializers.SerializerMethodField('get_data')
    is_continuous = serializers.SerializerMethodField('get_is_continuous')
    is_categorical = serializers.SerializerMethodField('get_is_categorical')

    class Meta:
        model = BiomarkerType
        fields = '__all__'

    def get_data(self, bt) -> Dict[str, List] | None:
        return bt.data().to_dict(orient='list')

    def get_is_categorical(self, bt) -> bool:
        return bt.is_categorical()

    def get_is_continuous(self, bt) -> bool:
        return bt.is_continuous()
