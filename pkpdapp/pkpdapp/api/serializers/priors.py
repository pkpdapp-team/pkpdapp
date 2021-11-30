#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import serializers
from pkpdapp.models import (
    PriorNormal, PriorUniform, Boundary, Prior, Inference
)
from pkpdapp.api.serializers import PolymorphicSerializer


class PriorNormalSerializer(serializers.ModelSerializer):
    inference = serializers.PrimaryKeyRelatedField(
        queryset=Inference.objects.all(),
        required=False
    )
    type = serializers.SerializerMethodField()

    class Meta:
        model = PriorNormal
        fields = '__all__'

    def get_type(self, obj):
        return 'PriorNormal'


class PriorUniformSerializer(serializers.ModelSerializer):
    inference = serializers.PrimaryKeyRelatedField(
        queryset=Inference.objects.all(),
        required=False
    )
    type = serializers.SerializerMethodField()
    class Meta:
        model = PriorUniform
        fields = '__all__'

    def get_type(self, obj):
        return 'PriorUniform'


class BoundarySerializer(serializers.ModelSerializer):
    inference = serializers.PrimaryKeyRelatedField(
        queryset=Inference.objects.all(),
        required=False
    )
    type = serializers.SerializerMethodField()
    class Meta:
        model = Boundary
        fields = '__all__'

    def get_type(self, obj):
        return 'Boundary'


class PriorSerializer(PolymorphicSerializer):
    class Meta:
        model = Prior

    def get_serializer_map(self):
        return {
            'PriorNormal': PriorNormalSerializer,
            'PriorUniform': PriorUniformSerializer,
        }
