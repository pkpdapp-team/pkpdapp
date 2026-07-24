#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from rest_framework import serializers
from pkpdapp.models import SubjectGroup
from pkpdapp.api.serializers import ProtocolSerializer
from pkpdapp.api.serializers.covariate_population import (
    CovariatePopulationSerializer,
)


class SubjectGroupSerializer(serializers.ModelSerializer):
    subjects = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    protocols = ProtocolSerializer(many=True)
    covariate_populations = CovariatePopulationSerializer(many=True, read_only=True)

    class Meta:
        model = SubjectGroup
        fields = "__all__"

    def create(self, validated_data):
        from pkpdapp.models import CovariatePopulation

        protocols = validated_data.pop("protocols")
        subject_group = SubjectGroup.objects.create(**validated_data)
        for protocol in protocols:
            protocol["group"] = subject_group
            ProtocolSerializer().create(protocol)
        # give this new group a default population for every existing covariate
        if subject_group.project_id:
            for covariate in subject_group.project.covariates.all():
                CovariatePopulation.objects.create(
                    subject_group=subject_group, covariate=covariate
                )
        return subject_group
