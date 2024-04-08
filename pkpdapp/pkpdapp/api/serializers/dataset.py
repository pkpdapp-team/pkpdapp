#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from pkpdapp.utils import DataParser
from rest_framework import serializers
from pkpdapp.models import (
    Dataset
)
from pkpdapp.api.serializers import (
    BiomarkerTypeSerializer, ProtocolSerializer, SubjectGroupSerializer
)


class DatasetSerializer(serializers.ModelSerializer):
    biomarker_types = BiomarkerTypeSerializer(
        many=True, read_only=True
    )
    subjects = serializers.PrimaryKeyRelatedField(
        many=True, read_only=True
    )
    groups = SubjectGroupSerializer(
        many=True, read_only=True
    )
    protocols = ProtocolSerializer(
        many=True, read_only=True
    )

    class Meta:
        model = Dataset
        fields = '__all__'


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
