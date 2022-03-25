#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import serializers
from pkpdapp.models import (
    LogLikelihood, LogLikelihoodParameter,
)
from pkpdapp.api.serializers import (
    PriorSerializer
)


class BaseLogLikelihoodParameterSerializer(serializers.ModelSerializer):
    class Meta:
        model = LogLikelihoodParameter
        fields = '__all__'


class LogLikelihoodParameterSerializer(serializers.ModelSerializer):
    prior = PriorSerializer(required=False, allow_null=True)

    class Meta:
        model = LogLikelihoodParameter
        fields = '__all__'
        read_only_fields = ("log_likelihood", )

    def create(self, validated_data):
        # save method of log_likelihood will create its own parameters
        prior_data = validated_data.pop('prior', None)
        new_param = BaseLogLikelihoodParameterSerializer().create(
            validated_data
        )

        if prior_data:
            serializer = PriorSerializer()
            prior_data['log_likelihood_parameter'] = new_param
            serializer.create(prior_data)

        return new_param

    def update(self, instance, validated_data):
        prior_data = validated_data.pop('prior', None)
        new_param = BaseLogLikelihoodParameterSerializer().update(
            instance, validated_data
        )
        if prior_data is not None:
            serializer = PriorSerializer()
            if hasattr(instance, 'prior'):
                old_prior = instance.prior
                new_model = serializer.update(
                    old_prior, prior_data
                )
                new_model.save()
            else:
                prior_data['log_likelihood_parameter'] = new_param
                new_model = serializer.create(prior_data)
        else:
            if hasattr(instance, 'prior'):
                instance.prior.delete()

        return new_param


class BaseLogLikelihoodSerializer(serializers.ModelSerializer):
    class Meta:
        model = LogLikelihood
        fields = '__all__'


class LogLikelihoodSerializer(serializers.ModelSerializer):
    parameters = LogLikelihoodParameterSerializer(
        many=True
    )
    pd_model = serializers.SerializerMethodField('get_pd_model')
    dosed_pk_model = \
        serializers.SerializerMethodField('get_dosed_pk_model')
    dataset = serializers.SerializerMethodField('get_dataset')
    time_variable = serializers.SerializerMethodField('get_time_variable')

    class Meta:
        model = LogLikelihood
        fields = '__all__'
        read_only_fields = ("inference", )

    def get_time_variable(self, instance):
        time_variable = instance.get_model().variables.get(
            name='time'
        )
        return time_variable.id

    def get_dosed_pk_model(self, instance):
        if instance.variable.dosed_pk_model:
            return instance.variable.dosed_pk_model.id

    def get_pd_model(self, instance):
        if instance.variable.pd_model:
            return instance.variable.pd_model.id

    def get_dataset(self, instance):
        if instance.biomarker_type:
            return instance.biomarker_type.dataset.id

    def create(self, validated_data):
        # save method of log_likelihood will create its own parameters
        parameters_data = validated_data.pop('parameters')
        new_log_likelihood = BaseLogLikelihoodSerializer().create(
            validated_data
        )

        # new log_likelihood will have had its parameters created, so
        # here we just update them with the validated data
        old_parameters = list((new_log_likelihood.parameters).all())
        for field_datas, old_models, Serializer in [
                (parameters_data, old_parameters,
                 LogLikelihoodParameterSerializer),
        ]:
            for field_data in field_datas:
                serializer = Serializer()
                try:
                    old_model = [
                        m for m in old_models
                        if m.name == field_data['name']
                    ][0]

                    # only allow updating value, and the prior
                    field_data = {
                        'value': field_data['value'],
                        'prior': field_data['prior']
                    }
                    new_model = serializer.update(
                        old_model, field_data
                    )
                    new_model.save()
                except IndexError:
                    pass
        return new_log_likelihood

    def update(self, instance, validated_data):
        parameters_data = validated_data.pop('parameters')
        old_parameters = list((instance.parameters).all())
        new_log_likelihood = BaseLogLikelihoodSerializer().update(
            instance, validated_data
        )

        for field_datas, old_models, Serializer in [
                (parameters_data, old_parameters,
                 LogLikelihoodParameterSerializer),
        ]:
            for field_data in field_datas:
                serializer = Serializer()
                try:
                    old_model = [
                        m for m in old_models
                        if m.name == field_data['name']
                    ][0]

                    # only allow updating value
                    field_data = {
                        'value': field_data['value'],
                        'prior': field_data['prior']
                    }
                    new_model = serializer.update(
                        old_model, field_data
                    )
                    new_model.save()
                except IndexError:
                    pass

        return new_log_likelihood
