#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from pkpdapp.models import Unit
from rest_framework.schemas.openapi import AutoSchema
from rest_framework import serializers
from typing import Dict, List
import logging

logger = logging.getLogger(__name__)


class UnitSchema(AutoSchema):
    """
    AutoSchema subclass that knows how to use extra_info.
    """

    ...


class UnitSerializer(serializers.ModelSerializer):
    compatible_units = serializers.SerializerMethodField("get_compatible_units")

    class Meta:
        model = Unit
        fields = "__all__"

    def get_compatible_units(self, unit) -> List[Dict[str, str]]:
        compound = self.context.get("compound")
        compatible_units = unit.get_compatible_units(compound=compound)
        sorted_units = compatible_units.order_by(
            "-g", "-m", "K", "A", "cd", "mol", "s", "-multiplier"
        )
        return [
            {
                "id": u.id,
                "symbol": u.symbol,
                "conversion_factor": unit.convert_to(
                    u, compound=compound, is_target=False
                ),
                "target_conversion_factor": unit.convert_to(
                    u, compound=compound, is_target=True
                ),
            }
            for u in sorted_units
        ]
