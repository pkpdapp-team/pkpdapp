#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import serializers
from pkpdapp.models import (
    Inference, InferenceChain, Algorithm,
    InferenceOutputResult,
)
import scipy.stats
import numpy as np
from pkpdapp.api.serializers import (
    LogLikelihoodSerializer,
)


class InferenceOutputResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = InferenceOutputResult
        fields = '__all__'


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

    def validate_log_likelihoods(self, value):
        """
        Check that the blog post is about Django.
        """
        names = [v['name'] for v in value]
        if(len(set(names)) < len(names)):
            raise serializers.ValidationError(
                "all log_likelihoods in an inference must have unique names"
            )
        return value

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

        # if read_only only update name, description and burnin
        if instance.read_only:
            validated_data = {
                key: validated_data[key]
                for key in ['name', 'description', 'burn_in']
                if key in validated_data
            }

        new_inference = BaseInferenceSerializer().update(
            instance, validated_data
        )

        # don't update log_likelihoods if read_only
        if not instance.read_only:
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
        outputs = {
            ll.id: inference_chain.outputs_for(ll).to_dict(orient='list')
            for ll in inference_chain.inference.log_likelihoods.all()
            if ll.is_a_prior()
        }
        return outputs

    def get_data(self, inference_chain):
        chain = inference_chain.as_pandas()
        by_priors = chain.groupby('priors')

        chain = {}
        kde = {}

        for prior, frame in by_priors:
            prior = int(frame['priors'].iloc[0])
            values = frame['values']

            # get kde density of chains
            min_value = values.min()
            max_value = values.max()
            kde_values = np.linspace(min_value, max_value, 100)
            kde_densities = scipy.stats.gaussian_kde(values)(kde_values)
            kde[prior] = {
                'values': kde_values.tolist(),
                'densities': kde_densities.tolist(),
            }

        # reduce to max 500 values for each prior
        sample_n = 500
        if any(by_priors['values'].count() > sample_n):
            by_priors = by_priors.sample(
                n=sample_n
            ).sort_index().groupby('priors')

        for prior, frame in by_priors:
            values = frame['values']
            iterations = frame['iterations']
            chain[prior] = {
                'values': values.tolist(),
                'iterations': iterations.tolist()
            }

        return {
            'kde': kde,
            'chain': chain,
        }
