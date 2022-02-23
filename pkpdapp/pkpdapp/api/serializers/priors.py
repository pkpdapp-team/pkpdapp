#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import serializers
from pkpdapp.models import (
    PriorNormal, PriorUniform, Prior, Inference
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
        read_only_fields = ("log_likelihood_parameter", )

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
        read_only_fields = ("log_likelihood_parameter", )

    def get_type(self, obj):
        return 'PriorUniform'


class PriorSerializer(PolymorphicSerializer):
    class Meta:
        model = Prior
        read_only_fields = ("log_likelihood_parameter", )

    name = serializers.SerializerMethodField()

    def get_name(self, obj):
        if obj.variable:
            return obj.variable.name
        elif obj.log_likelihood_parameter:
            return obj.log_likelihood_parameter.name
        else:
            return None

    def get_serializer_map(self):
        return {
            'PriorNormal': PriorNormalSerializer,
            'PriorUniform': PriorUniformSerializer,
        }
