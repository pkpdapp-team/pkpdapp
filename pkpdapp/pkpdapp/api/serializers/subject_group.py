#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from rest_framework import serializers
from pkpdapp.models import SubjectGroup
from pkpdapp.api.serializers import ProtocolSerializer


class SubjectGroupSerializer(serializers.ModelSerializer):
    subjects = serializers.PrimaryKeyRelatedField(
        many=True, read_only=True
    )
    protocols = ProtocolSerializer(
        many=True
    )

    class Meta:
        model = SubjectGroup
        fields = '__all__'

    def create(self, validated_data):
        protocols = validated_data.pop('protocols')
        subject_group = SubjectGroup.objects.create(**validated_data)
        for protocol in protocols:
            protocol['group'] = subject_group
            ProtocolSerializer.create(ProtocolSerializer(), protocol)
        return subject_group
