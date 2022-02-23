#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import serializers
from pkpdapp.models import (
    LogLikelihood, LogLikelihoodParameter,
    Inference,
)
from pkpdapp.api.serializers import (
    PriorSerializer, VariableSerializer
)


class BaseLogLikelihoodParameterSerializer(serializers.ModelSerializer):
    class Meta:
        model = LogLikelihoodParameter
        fields = '__all__'


class LogLikelihoodParameterSerializer(serializers.ModelSerializer):
    prior = PriorSerializer()

    class Meta:
        model = LogLikelihoodParameter
        fields = '__all__'
        read_only_fields = ("log_likelihood", )

    def create(self, validated_data):
        # save method of log_likelihood will create its own parameters
        prior_data = validated_data.pop('prior')
        new_param = BaseLogLikelihoodParameterSerializer().create(
            validated_data
        )

        serializer = PriorSerializer()
        prior_data['log_likelihood_parameter'] = new_param
        serializer.create(prior_data)

        return new_param

    def update(self, instance, validated_data):
        prior_data = validated_data.pop('prior')
        new_param = BaseLogLikelihoodParameterSerializer().update(
            instance, validated_data
        )
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

        return new_param


class BaseLogLikelihoodSerializer(serializers.ModelSerializer):
    class Meta:
        model = LogLikelihood
        fields = '__all__'


class LogLikelihoodSerializer(serializers.ModelSerializer):
    parameters = LogLikelihoodParameterSerializer(
        many=True
    )

    priors = PriorSerializer(
        many=True
    )

    class Meta:
        model = LogLikelihood
        fields = '__all__'
        read_only_fields = ("inference", )

    def create(self, validated_data):
        # save method of log_likelihood will create its own parameters
        parameters_data = validated_data.pop('parameters')
        priors_data = validated_data.pop('priors')
        print('creating new log_likelihood', validated_data)
        new_log_likelihood = BaseLogLikelihoodSerializer().create(
            validated_data
        )

        print('created new log_likelihood', validated_data)

        for field_datas, Serializer in [
                (priors_data, PriorSerializer),
        ]:
            for field_data in field_datas:
                serializer = Serializer()
                field_data['log_likelihood'] = new_log_likelihood
                serializer.create(field_data)

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
                except IndexError:
                    pass
                new_model.save()
        return new_log_likelihood

    def update(self, instance, validated_data):
        parameters_data = validated_data.pop('parameters')
        priors_data = validated_data.pop('priors')
        old_priors = list((instance.priors).all())
        old_parameters = list((instance.parameters).all())
        new_log_likelihood = BaseLogLikelihoodSerializer().update(
            instance, validated_data
        )

        for field_datas, old_models, Serializer in [
                (priors_data, old_priors, PriorSerializer),
        ]:
            for field_data in field_datas:
                serializer = Serializer()
                try:
                    old_model = old_models.pop(0)
                    new_model = serializer.update(
                        old_model, field_data
                    )
                except IndexError:
                    field_data['log_likelihood'] = new_log_likelihood
                    new_model = serializer.create(field_data)
                new_model.save()

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
                        'value': field_data['value']
                    }
                    new_model = serializer.update(
                        old_model, field_data
                    )
                except IndexError:
                    pass
                new_model.save()

        return new_log_likelihood
