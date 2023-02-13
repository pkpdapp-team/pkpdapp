#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from pkpdapp.utils import DataParser
from rest_framework import serializers
import codecs
import pandas as pd
from pkpdapp.models import (
    Dataset, BiomarkerType, Protocol, Subject,
    Unit, Compound, Biomarker, Dose,
)
from pkpdapp.api.serializers import ProtocolSerializer


class DatasetSerializer(serializers.ModelSerializer):
    biomarker_types = serializers.PrimaryKeyRelatedField(
        many=True, read_only=True
    )
    subjects = serializers.PrimaryKeyRelatedField(
        many=True, read_only=True
    )
    subject_groups = serializers.SerializerMethodField('get_groups')
    protocols = serializers.SerializerMethodField('get_protocols')

    class Meta:
        model = Dataset
        fields = '__all__'

    def get_protocols(self, dataset):
        protocols = [
            Protocol.objects.get(pk=p['protocol'])
            for p in dataset.subjects.values('protocol').distinct()
            if p['protocol'] is not None
        ]
        return ProtocolSerializer(protocols, many=True).data

    def get_groups(self, dataset):
        groups = {}
        for s in dataset.subjects.all():
            for group in s.groups.all():
                if group.name not in groups:
                    groups[group.name] = []
                groups[group.name].append(s.pk)
        return groups


class DatasetCsvSerializer(serializers.ModelSerializer):
    csv = serializers.FileField()

    class Meta:
        model = Dataset
        fields = ['csv']

    def validate_csv(self, csv):
        utf8_file = codecs.EncodedFile(csv.open(), "utf-8")
        parser = DataParser()

        # error in columns
        try:
            data = parser.parse_from_stream(utf8_file)
        except RuntimeError as err:
            raise serializers.ValidationError(str(err))

        return data

    def update(self, instance, validated_data):
        data = validated_data['csv']
        instance.replace_data(data)
        return instance
