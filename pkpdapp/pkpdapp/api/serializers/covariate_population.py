#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from pkpdapp.models import Covariate, CovariatePopulation
from pkpdapp.models.project import ProjectAccess


class CovariatePopulationSerializer(serializers.ModelSerializer):
    class Meta:
        model = CovariatePopulation
        fields = "__all__"

    def validate(self, data):
        covariate = data.get("covariate", getattr(self.instance, "covariate", None))
        subject_group = data.get(
            "subject_group", getattr(self.instance, "subject_group", None)
        )
        if covariate is None or subject_group is None:
            return data
        if (
            covariate.project_id is None
            or subject_group.project_id is None
            or covariate.project_id != subject_group.project_id
        ):
            raise serializers.ValidationError(
                "covariate and subject_group must belong to the same project"
            )

        request = self.context.get("request")
        if request is not None and not request.user.is_superuser:
            try:
                access = ProjectAccess.objects.get(
                    project_id=covariate.project_id,
                    user=request.user,
                )
            except ProjectAccess.DoesNotExist:
                raise PermissionDenied("You do not have access to this project")
            if access.read_only:
                raise PermissionDenied("You have read-only access to this project")

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
