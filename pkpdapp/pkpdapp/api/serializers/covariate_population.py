#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from rest_framework import serializers
from pkpdapp.models import Covariate, CovariatePopulation


class CovariatePopulationSerializer(serializers.ModelSerializer):
    class Meta:
        model = CovariatePopulation
        fields = "__all__"

    def validate(self, data):
        covariate = data.get("covariate", getattr(self.instance, "covariate", None))
        probabilities = data.get(
            "category_probabilities",
            getattr(self.instance, "category_probabilities", None),
        )
        if (
            covariate is not None
            and covariate.type == Covariate.Type.CATEGORICAL
            and probabilities is not None
            and covariate.n_categories is not None
            and len(probabilities) != covariate.n_categories
        ):
            raise serializers.ValidationError(
                "category_probabilities must have one entry per category"
            )
        return data
