#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import serializers
from pkpdapp.models import (
    Dose, Protocol
)
from pkpdapp.api.serializers import DoseSerializer


class ProtocolSerializer(serializers.ModelSerializer):
    doses = DoseSerializer(
        many=True, read_only=True
    )
    dose_ids = serializers.PrimaryKeyRelatedField(
        queryset=Dose.objects.all(),
        source='doses',
        many=True, write_only=True,
    )
    dosed_pk_models = serializers.PrimaryKeyRelatedField(
        many=True, read_only=True
    )
    dataset = serializers.SerializerMethodField('get_dataset')

    class Meta:
        model = Protocol
        fields = '__all__'

    def get_dataset(self, protocol):
        return protocol.subjects.values('dataset').distinct()[0]['dataset']
