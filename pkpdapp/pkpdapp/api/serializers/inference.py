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
    PkpdSerializer, PharmacodynamicSerializer,
    DosedPharmacokineticSerializer,
    PriorSerializer,
    ObjectiveFunctionSerializer,
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
    priors = PriorSerializer(
        many=True
    )
    objective_functions = ObjectiveFunctionSerializer(
        many=True
    )

    class Meta:
        model = Inference
        fields = '__all__'

    def create(self, validated_data):
        new_inference = BaseInferenceSerializer().create(
            validated_data
        )
        for name, Serializer in [
                ('priors', PriorSerializer),
                ('objective_functions', ObjectiveFunctionSerializer)
        ]:
            field_datas = validated_data.pop(name)
            for field_data in field_datas:
                serializer = Serializer()
                new_model = serializer.create(field_data)
                new_model.save()

        return


    def update(self, instance, validated_data):
        for name, Serializer in [
                ('priors', PriorSerializer),
                ('objective_functions', ObjectiveFunctionSerializer)
        ]:
            field_datas = validated_data.pop(name)
            old_models = list((instance.priors).all())

            for field_data in field_datas:
                serializer = Serializer()
                try:
                    old_model = old_models.pop(0)
                    new_model = serializer.update(
                        old_model, field_data
                    )
                except IndexError:
                    new_model = serializer.create(field_data)
                new_model.save()

        return BaseInferenceSerializer().update(
            instance, validated_data
        )


class InferenceChainSerializer(serializers.ModelSerializer):
    values = serializers.SerializerMethodField('get_values')

    class Meta:
        model = InferenceChain
        fields = '__all__'

    def get_values(self, inference_chain):
        return inference_chain.as_list()
