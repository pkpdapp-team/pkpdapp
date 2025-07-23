#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from rest_framework import serializers
from pkpdapp.models import (
    EfficacyExperiment
)


class EfficacyExperimentSerializer(serializers.ModelSerializer):
    class Meta:
        model = EfficacyExperiment
        fields = '__all__'
