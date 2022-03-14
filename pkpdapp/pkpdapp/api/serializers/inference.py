#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import serializers
from pkpdapp.models import (
    Inference, InferenceChain, Algorithm
)
import scipy.stats
import numpy as np
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
        print('craete inference', validated_data)
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
    outputs = serializers.SerializerMethodField('get_outputs')

    class Meta:
        model = InferenceChain
        fields = '__all__'

    def get_outputs(self, inference_chain):

    def get_data(self, inference_chain):
        chain = inference_chain.as_pandas()
        by_priors = chain.groupby('priors')

        chain = {}
        kde = {}
        print(inference_chain.id)

        for prior, frame in by_priors:
            prior = int(frame['priors'].iloc[0])
            values = frame['values']

            # get kde density of chains
            min_value = values.min()
            max_value = values.max()
            kde_values = np.linspace(min_value, max_value, 100)
            try:
                kde_densities = scipy.stats.gaussian_kde(values)(kde_values)
            except:
                kde_densities = np.zeros_like(kde_values)
            kde[prior] = {
                'values': kde_values.tolist(),
                'densities': kde_densities.tolist(),
            }

            #if values.count() > 0:
            #    hist, bin_edges = np.histogram(values, bins='sturges')
            #    bins = 0.5 * (bin_edges[1:] + bin_edges[:-1])
            #else:
            #    hist = np.array([0])
            #    bins = np.array([0])
            #kde[prior] = {
            #    'values': bins.tolist(),
            #    'densities': hist.tolist(),
            #}

            # only send a max of 500 chain values
            sample_n = 500
            if values.count() > sample_n:
                values = values.sample(n=sample_n)

            chain[prior] = values.tolist()

        return {
            'kde': kde,
            'chain': chain,
        }
