#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import serializers
from pkpdapp.models import (
    Inference, InferenceChain
)


class InferenceSerializer(serializers.ModelSerializer):

    class Meta:
        model = Inference
        fields = '__all__'


class InferenceChainSerializer(serializers.ModelSerializer):
    values = serializers.SerializerMethodField('get_values')

    class Meta:
        model = InferenceChain
        fields = '__all__'

    def get_values(self, inference_chain):
        return inference_chain.as_list()
