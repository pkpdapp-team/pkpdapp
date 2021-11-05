#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import serializers

class NcaSerializer(serializers.Serializer):
    times = serializers.ListField(
        child=serializers.FloatField()
    )
    concentrations = serializers.ListField(
        child=serializers.FloatField()
    )
    dose_amount = serializers.FloatField()
    administration_route = serializers.CharField()
    c_0 = serializers.FloatField()
    auc_0_last = serializers.FloatField()
    aumc_0_last = serializers.FloatField()
    lambda_z = serializers.FloatField()
    r2 = serializers.FloatField()
    num_points = serializers.IntegerField(min_value=0)
    auc_infinity = serializers.FloatField()
    auc_infinity_dose = serializers.FloatField()
    auc_extrap_percent = serializers.FloatField()
    cl = serializers.FloatField()
    c_max = serializers.FloatField()
    t_max = serializers.FloatField()
    c_max_dose = serializers.FloatField()
    aumc = serializers.FloatField()
    aumc_extrap_percent = serializers.FloatField()
    mrt = serializers.FloatField()
    tlast = serializers.FloatField()
    t_half = serializers.FloatField()
    v_ss = serializers.FloatField()
    v_z = serializers.FloatField()



