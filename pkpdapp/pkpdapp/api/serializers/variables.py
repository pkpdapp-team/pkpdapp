#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from typing import List
from rest_framework import serializers
from pkpdapp.models import (
    Variable,
)


class VariableSerializer(serializers.ModelSerializer):
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
