#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from rest_framework import serializers
from pkpdapp.models import (
    BiomarkerType
)


class BiomarkerTypeSerializer(serializers.ModelSerializer):
    data = serializers.SerializerMethodField('get_data')

    class Meta:
        model = BiomarkerType
        fields = '__all__'

    def get_data(self, bt):
        return bt.as_pandas().to_dict(orient='list')
