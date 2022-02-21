#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import serializers
from pkpdapp.models import (
    Inference, InferenceChain, Algorithm
)
from pkpdapp.api.serializers import (
    PriorSerializer,
    LogLikelihoodSerializer,
    VariableSerializer,
)


class AlgorithmSerializer(serializers.ModelSerializer):
    class Meta:
        model = Algorithm
        fields = '__all__'


class BaseInferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Inference
        fields = '__all__'


class InferenceSerializer(serializers.ModelSerializer):

    log_likelihoods = LogLikelihoodSerializer(
        many=True
    )

    class Meta:
        model = Inference
        fields = '__all__'

    def create(self, validated_data):
        log_likelihood_data = validated_data.pop('log_likelihoods')
        new_inference = BaseInferenceSerializer().create(
            validated_data
        )
        for field_datas, Serializer in [
                (log_likelihood_data, LogLikelihoodSerializer),
        ]:
            for field_data in field_datas:
                serializer = Serializer()
                field_data['inference'] = new_inference
                serializer.create(field_data)

        return new_inference

    def update(self, instance, validated_data):
        log_likelihood_data = validated_data.pop('log_likelihoods')
        old_log_likelihoods = list((instance.log_likelihoods).all())
        new_inference = BaseInferenceSerializer().update(
            instance, validated_data
        )
        for field_datas, old_models, Serializer in [
                (log_likelihood_data,
                 old_log_likelihoods, LogLikelihoodSerializer)
        ]:
            for field_data in field_datas:
                serializer = Serializer()
                try:
                    old_model = old_models.pop(0)
                    new_model = serializer.update(
                        old_model, field_data
                    )
                except IndexError:
                    field_data['inference'] = new_inference
                    new_model = serializer.create(field_data)
                new_model.save()

        return new_inference


class InferenceChainSerializer(serializers.ModelSerializer):
    data = serializers.SerializerMethodField('get_data')

    class Meta:
        model = InferenceChain
        fields = '__all__'

    def get_data(self, inference_chain):
        result = inference_chain.as_pandas().to_dict(orient='list')
        return result
