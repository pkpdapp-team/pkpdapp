#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import serializers
from drf_writable_nested.serializers import WritableNestedModelSerializer
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


class InferenceSerializer(
    WritableNestedModelSerializer
):
    pd_model_detail = PharmacodynamicSerializer(
        source='pd_model', read_only=True
    )
    dosed_pk_model_detail = DosedPharmacokineticSerializer(
        source='dosed_pk_model', read_only=True
    )
    pkpd_model_detail = PkpdSerializer(
        source='pkpd_model', read_only=True
    )
    priors = PriorSerializer(many=True)
    objective_functions = ObjectiveFunctionSerializer(many=True)

    class Meta:
        model = Inference
        fields = '__all__'

    #def update(self, instance, validated_data):
    #    for name, Serializer in [
    #            ('priors', PriorSerializer),
    #            ('objective_functions', ObjectiveFunctionSerializer)
    #    ]:
    #        field_datas = validated_data.pop(name)
    #        old_models = (instance.priors).all()
    #        old_models_map = {p.id: p for p in old_models}

    #        for field_data in field_datas:
    #            serializer = Serializer(field_data)
    #            serializer.is_valid()
    #            field_validated_data = serializer.validated_data
    #            if 'id' in field_data:
    #                old_field = old_models_map[field_data['id']]
    #                field = serializer.update(
    #                    old_field, field_validated_data
    #                )
    #            else:
    #                field = serializer.create(field_validated_data)
    #            field.save()

    #    return InferenceSerializer.update(instance, validated_data)


class InferenceChainSerializer(serializers.ModelSerializer):
    values = serializers.SerializerMethodField('get_values')

    class Meta:
        model = InferenceChain
        fields = '__all__'

    def get_values(self, inference_chain):
        return inference_chain.as_list()
