#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import serializers
from pkpdapp.models import (
    Distribution,
    Variable,
)


class DistributionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Distribution
        fields = ["id", "pdf", "variance"]


class VariableSerializer(serializers.ModelSerializer):
    protocols = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    distribution = DistributionSerializer(required=False, allow_null=True)

    class Meta:
        model = Variable
        fields = "__all__"

    def to_internal_value(self, data):
        optional_fields = [
            "lower_bound",
            "upper_bound",
        ]
        for field in optional_fields:
            if data.get(field, None) == "":
                data[field] = None
        return super(VariableSerializer, self).to_internal_value(data)

    def _apply_distribution(self, variable, distribution_data, provided):
        """Create, update or delete the variable's one-to-one distribution.

        ``provided`` distinguishes an omitted ``distribution`` key (leave as-is)
        from an explicit ``null`` (delete any existing distribution).
        """
        if not provided:
            return
        if distribution_data is None:
            Distribution.objects.filter(variable=variable).delete()
            return
        Distribution.objects.update_or_create(
            variable=variable,
            defaults=distribution_data,
        )

    def create(self, validated_data):
        provided = "distribution" in validated_data
        distribution_data = validated_data.pop("distribution", None)
        variable = super().create(validated_data)
        self._apply_distribution(variable, distribution_data, provided)
        return variable

    def update(self, instance, validated_data):
        provided = "distribution" in validated_data
        distribution_data = validated_data.pop("distribution", None)
        variable = super().update(instance, validated_data)
        self._apply_distribution(variable, distribution_data, provided)
        return variable
