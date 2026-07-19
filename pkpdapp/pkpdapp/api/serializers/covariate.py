#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from rest_framework import serializers
from pkpdapp.models import Covariate


class CovariateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Covariate
        fields = "__all__"

    def validate(self, data):
        cov_type = data.get("type", getattr(self.instance, "type", None))
        if cov_type == Covariate.Type.CATEGORICAL:
            n_categories = data.get(
                "n_categories", getattr(self.instance, "n_categories", None)
            )
            if n_categories is None or n_categories < 2:
                raise serializers.ValidationError(
                    "categorical covariates need at least 2 categories"
                )
        return data
