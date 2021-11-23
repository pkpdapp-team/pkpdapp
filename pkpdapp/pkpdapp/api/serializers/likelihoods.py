#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import serializers
from pkpdapp.models import (
    ObjectiveFunction,
    LogLikelihoodNormal, LogLikelihoodLogNormal,
    SumOfSquaredErrorsScoreFunction,
)
from pkpdapp.api.serializers import PolymorphicSerializer


class LogLikelihoodNormalSerializer(serializers.ModelSerializer):
    class Meta:
        model = LogLikelihoodNormal
        fields = '__all__'


class LogLikelihoodLogNormalSerializer(serializers.ModelSerializer):
    class Meta:
        model = LogLikelihoodLogNormal
        fields = '__all__'


class SumOfSquaredErrorsScoreFunctionSerializer(
        serializers.ModelSerializer
):
    class Meta:
        model = SumOfSquaredErrorsScoreFunction
        fields = '__all__'


class ObjectiveFunctionSerializer(PolymorphicSerializer):
    class Meta:
        model = ObjectiveFunction

    def get_serializer_map(self):
        return {
            LogLikelihoodLogNormalSerializer.__class__:
            LogLikelihoodLogNormalSerializer,
            LogLikelihoodLogNormalSerializer.__class__:
            LogLikelihoodLogNormalSerializer,
            SumOfSquaredErrorsScoreFunctionSerializer.__class__:
            SumOfSquaredErrorsScoreFunctionSerializer
        }
