#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import serializers


class AuceSerializer(serializers.Serializer):
    name = serializers.CharField()
    fit_type = serializers.CharField()
    subject_ids = serializers.ListField(
        child=serializers.IntegerField()
    )
    concentrations = serializers.ListField(
        child=serializers.FloatField()
    )
    auce = serializers.ListField(
        child=serializers.FloatField()
    )

    x = serializers.ListField(
        child=serializers.FloatField()
    )
    y = serializers.ListField(
        child=serializers.FloatField()
    )
    y_upper = serializers.ListField(
        child=serializers.FloatField()
    )
    y_lower = serializers.ListField(
        child=serializers.FloatField()
    )
    fit_EC50 = serializers.FloatField()
    sigma_EC50 = serializers.FloatField()
    fit_top = serializers.FloatField()
    sigma_top = serializers.FloatField()
    fit_bottom = serializers.FloatField()
    sigma_bottom = serializers.FloatField()
