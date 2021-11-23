#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import serializers
from pkpdapp.models import (
    PriorNormal, PriorUniform, Boundary, Prior
)
from pkpdapp.serializers import PolymorphicSerializer


class PriorNormalSerializer(serializers.ModelSerializer):
    class Meta:
        model = PriorNormal
        fields = '__all__'


class PriorUniformSerializer(serializers.ModelSerializer):
    class Meta:
        model = PriorUniform
        fields = '__all__'


class BoundarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Boundary
        fields = '__all__'


class PriorSerializer(PolymorphicSerializer):
    class Meta:
        model = Prior

    def get_serializer_map(self):
        return {
            PriorNormalSerializer.__class__:
            PriorNormalSerializer,
            PriorUniformSerializer.__class__:
            PriorUniformSerializer,
            BoundarySerializer.__class__:
            BoundarySerializer,
        }
