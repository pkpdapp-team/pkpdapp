#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import serializers


class StrictCharField(serializers.CharField):
    def to_internal_value(self, data):
        if not isinstance(data, str):
            self.fail("invalid")
        return super().to_internal_value(data)


class ChatbotContextSerializer(serializers.Serializer):
    """Validate browser-owned context attached to a chat turn."""

    page = StrictCharField(
        required=False, allow_blank=True, allow_null=True, max_length=200
    )
    sub_page = StrictCharField(
        required=False, allow_blank=True, allow_null=True, max_length=200
    )

    def to_internal_value(self, data):
        unknown_fields = set(data) - set(self.fields)
        if unknown_fields:
            raise serializers.ValidationError(
                {
                    field: ["This field is not allowed."]
                    for field in sorted(unknown_fields)
                }
            )
        return super().to_internal_value(data)
