#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import serializers
from pkpdapp.models import Dose, Protocol
from pkpdapp.api.serializers import DoseSerializer


class ProtocolSerializer(serializers.ModelSerializer):
    doses = DoseSerializer(many=True)
    variables = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    subjects = serializers.PrimaryKeyRelatedField(many=True, read_only=True)

    class Meta:
        model = Protocol
        fields = "__all__"

    def get_dataset(self, protocol):
        return protocol.get_dataset()

    def create(self, validated_data):
        doses = validated_data.pop("doses")
        protocol = Protocol.objects.create(**validated_data)
        for dose in doses:
            dose["protocol"] = protocol
            Dose.objects.create(**dose)
        return protocol

    def update(self, instance, validated_data):
        validated_data.pop("doses")
        # Dose.objects.filter(protocol=instance).delete()
        # for dose in doses:
        #    dose["protocol"] = instance
        #    DoseSerializer.create(DoseSerializer(), dose)
        return super().update(instance, validated_data)
