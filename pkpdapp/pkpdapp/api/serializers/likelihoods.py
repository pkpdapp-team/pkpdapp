#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import serializers
from pkpdapp.models import (
    ObjectiveFunction,
    LogLikelihoodNormal, LogLikelihoodLogNormal,
    SumOfSquaredErrorsScoreFunction, Inference,
)
from pkpdapp.api.serializers import PolymorphicSerializer


class LogLikelihoodNormalSerializer(serializers.ModelSerializer):
    inference = serializers.PrimaryKeyRelatedField(
        queryset=Inference.objects.all(),
        required=False
    )
    type = serializers.SerializerMethodField()

    class Meta:
        model = LogLikelihoodNormal
        fields = '__all__'

    def get_type(self, obj):
        return 'LogLikelihoodNormal'


class LogLikelihoodLogNormalSerializer(serializers.ModelSerializer):
    inference = serializers.PrimaryKeyRelatedField(
        queryset=Inference.objects.all(),
        required=False
    )
    type = serializers.SerializerMethodField()

    class Meta:
        model = LogLikelihoodLogNormal
        fields = '__all__'

    def get_type(self, obj):
        return 'LogLikelihoodLogNormal'


class SumOfSquaredErrorsScoreFunctionSerializer(
        serializers.ModelSerializer
):
    inference = serializers.PrimaryKeyRelatedField(
        queryset=Inference.objects.all(),
        required=False
    )
    type = serializers.SerializerMethodField()

    class Meta:
        model = SumOfSquaredErrorsScoreFunction
        fields = '__all__'

    def get_type(self, obj):
        return 'SumOfSquaredErrorsScoreFunction'


class ObjectiveFunctionSerializer(PolymorphicSerializer):
    class Meta:
        model = ObjectiveFunction

    def get_serializer_map(self):
        return {
            'LogLikelihoodNormal': LogLikelihoodNormalSerializer,
            'LogLikelihoodLogNormal': LogLikelihoodLogNormalSerializer,
            'SumOfSquaredErrorsScoreFunction':SumOfSquaredErrorsScoreFunctionSerializer
        }
