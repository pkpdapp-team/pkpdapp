#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from rest_framework import serializers
from pkpdapp.models import Protocol, SubjectGroup
from pkpdapp.api.serializers import ProtocolSerializer
from drf_spectacular.utils import extend_schema_field


class SubjectGroupSerializer(serializers.ModelSerializer):
    subjects = serializers.PrimaryKeyRelatedField(
        many=True, read_only=True
    )
    protocols = serializers.SerializerMethodField('get_protocols')

    class Meta:
        model = SubjectGroup
        fields = '__all__'

    @extend_schema_field(ProtocolSerializer(many=True))
    def get_protocols(self, subject_group):
        protocols = [
            Protocol.objects.get(pk=p['protocol'])
            for p in subject_group.subjects.values('protocol').distinct()
            if p['protocol'] is not None
        ]
        return ProtocolSerializer(protocols, many=True).data
