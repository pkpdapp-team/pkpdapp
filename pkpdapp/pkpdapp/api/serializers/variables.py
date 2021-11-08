#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import serializers
from pkpdapp.models import (
    Variable, StoredVariable
)
from pkpdapp.api.serializers import (
    LogLikelihoodNormalSerializer,
    LogLikelihoodLogNormalSerializer,
    SumOfSquaredErrorsScoreFunctionSerializer,
    PriorNormalSerializer,
    PriorUniformSerializer,
    BoundarySerializer,
)


class VariableSerializer(serializers.ModelSerializer):
    class Meta:
        model = Variable
        fields = '__all__'


class StoredVariableSerializer(serializers.ModelSerializer):
    loglikelihoodnormal = \
        LogLikelihoodNormalSerializer(read_only=True)
    loglikelihoodlognormal = \
        LogLikelihoodLogNormalSerializer(read_only=True)
    sumofsquarederrorsscorefunction = \
        SumOfSquaredErrorsScoreFunctionSerializer(read_only=True)
    priornormal = \
        PriorNormalSerializer(read_only=True)
    prioruniform = \
        PriorUniformSerializer(read_only=True)
    boundary = \
        BoundarySerializer(read_only=True)

    class Meta:
        model = StoredVariable
        fields = '__all__'
