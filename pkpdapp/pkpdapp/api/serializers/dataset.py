#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from pkpdapp.utils import DataParser
from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from pkpdapp.models import (
    Dataset, Protocol,
)
from pkpdapp.api.serializers import ProtocolSerializer


class DatasetSerializer(serializers.ModelSerializer):
    biomarker_types = serializers.PrimaryKeyRelatedField(
        many=True, read_only=True
    )
    subjects = serializers.PrimaryKeyRelatedField(
        many=True, read_only=True
    )
    protocols = serializers.SerializerMethodField('get_protocols')

    class Meta:
        model = Dataset
        fields = '__all__'

    @extend_schema_field(ProtocolSerializer(many=True))
    def get_protocols(self, dataset):
        protocols = [
            Protocol.objects.get(pk=p['protocol'])
            for p in dataset.subjects.values('protocol').distinct()
            if p['protocol'] is not None
        ]
        return ProtocolSerializer(protocols, many=True).data


class DatasetCsvSerializer(serializers.ModelSerializer):
    csv = serializers.CharField()

    class Meta:
        model = Dataset
        fields = ['csv']

    def validate_csv(self, csv):
        parser = DataParser()

        # error in columns
        try:
            data = parser.parse_from_str(csv)
        except RuntimeError as err:
            raise serializers.ValidationError(str(err))
        except UnicodeDecodeError as err:
            raise serializers.ValidationError(str(err))

        return data

    def update(self, instance, validated_data):
        data = validated_data['csv']
        instance.replace_data(data)
        return instance
