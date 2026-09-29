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
    copy_covariates_from = serializers.PrimaryKeyRelatedField(
        queryset=SubjectGroup.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
        help_text=(
            "on create, copy covariate population values from this group; "
            "defaults are used when unset or from another project"
        ),
    )

    class Meta:
        model = SubjectGroup
        fields = "__all__"

    def create(self, validated_data):
        from pkpdapp.models import CovariatePopulation

        protocols = validated_data.pop("protocols")
        source_group = validated_data.pop("copy_covariates_from", None)
        subject_group = SubjectGroup.objects.create(**validated_data)
        for protocol in protocols:
            protocol["group"] = subject_group
            ProtocolSerializer().create(protocol)
        # give this new group a population for every existing covariate, copying
        # the values from the source group where available, defaults otherwise
        if subject_group.project_id:
            source_populations = {}
            if (
                source_group is not None
                and source_group.project_id == subject_group.project_id
            ):
                source_populations = {
                    population.covariate_id: population
                    for population in source_group.covariate_populations.all()
                }
            for covariate in subject_group.project.covariates.all():
                source = source_populations.get(covariate.id)
                if source is not None:
                    source.copy(subject_group, covariate)
                else:
                    CovariatePopulation.objects.create(
                        subject_group=subject_group, covariate=covariate
                    )
        return subject_group
