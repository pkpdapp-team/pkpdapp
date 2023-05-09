#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from rest_framework import serializers
from pkpdapp.models import (
    Compound
)
from pkpdapp.api.serializers import EfficacySerializer

class BaseCompoundSerializer(serializers.ModelSerializer):
    class Meta:
        model = Compound
        fields = '__all__'

class CompoundSerializer(serializers.ModelSerializer):
    efficacy_experiments = EfficacySerializer(many=True)

    class Meta:
        model = Compound
        fields = '__all__'

    def create(self, validated_data):
        # save method of log_likelihood will create its own parameters,
        # so ignore any parameters that are given
        experiments = validated_data.pop('efficacy_experiments')
        compound = BaseCompoundSerializer().create(
            validated_data
        )
        for exp in experiments:
            exp['compound'] = compound
            serializer = EfficacySerializer()
            serializer.create(exp)
        return compound

    def update(self, instance, validated_data):
        experiments = validated_data.pop('efficacy_experiments')
        old_experiments = list(instance.efficacy_experiments.all())
        project = BaseCompoundSerializer().update(
            instance, validated_data
        )
        for exp in experiments:
            exp['compound'] = instance.id
            serializer = EfficacySerializer()
            old_experiment = [
                i for i, a in enumerate(old_experiments) if a.id == exp['id']
            ]
            if not old_experiment:
                new_exp = serializer.create(exp)
            else:
                new_exp = serializer.update(
                    old_experiments.pop(old_experiment[0]), exp
                )
            new_exp.save()

        # delete any old accesses
        for old_exp in old_experiments:
            old_exp.delete()

        project.refresh_from_db()

        return project

