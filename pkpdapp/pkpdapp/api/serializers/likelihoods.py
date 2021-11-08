#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import serializers
from pkpdapp.models import (
    LogLikelihoodNormal, LogLikelihoodLogNormal,
    SumOfSquaredErrorsScoreFunction,
)


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
