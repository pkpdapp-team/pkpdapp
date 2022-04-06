#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import serializers
from pkpdapp.models import (
    LogLikelihood, LogLikelihoodParameter,
    DosedPharmacokineticModel, PharmacodynamicModel
)
from pkpdapp.api.serializers import (
    PriorSerializer
)


class LogLikelihoodParameterSerializer(serializers.ModelSerializer):
    class Meta:
        model = LogLikelihoodParameter
        fields = '__all__'
        read_only_fields = ("parent", )


class BaseLogLikelihoodSerializer(serializers.ModelSerializer):
    class Meta:
        model = LogLikelihood
        fields = '__all__'


class LogLikelihoodSerializer(serializers.ModelSerializer):
    parameters = LogLikelihoodParameterSerializer(
        many=True
    )
    model = serializers.SerializerMethodField('get_model')
    dataset = serializers.SerializerMethodField('get_dataset')
    time_variable = serializers.SerializerMethodField('get_time_variable')

    class Meta:
        model = LogLikelihood
        fields = '__all__'
        read_only_fields = ("inference", )

    def get_time_variable(self, instance):
        model = instance.get_model()
        if model is not None:
            time_variable = model.variables.get(
                name='time'
            )
            return time_variable.id

    def get_model(self, instance):
        model = instance.get_model()
        if model is not None:
            return {model._meta.db_table, model.id}

    def get_dataset(self, instance):
        if instance.biomarker_type:
            return instance.biomarker_type.dataset.id

    def create(self, validated_data):
        # save method of log_likelihood will create its own parameters,
        # so ignore any parameters that are given
        validated_data.pop('parameters')
        new_log_likelihood = BaseLogLikelihoodSerializer().create(
            validated_data
        )
        return new_log_likelihood

    def update(self, instance, validated_data):
        parameters_data = validated_data.pop('parameters')
        old_parameters = list((instance.parameters).all())
        new_log_likelihood = BaseLogLikelihoodSerializer().update(
            instance, validated_data
        )

        # update params with new info
        for field_datas, old_models, Serializer in [
                (parameters_data, old_parameters,
                 LogLikelihoodParameterSerializer),
        ]:
            for field_data in field_datas:
                serializer = Serializer()
                old_model = old_parameters.pop(0)
                new_model = serializer.update(
                    old_model, field_data
                )
                new_model.save()

        return new_log_likelihood
