#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from rest_framework import serializers
from pkpdapp.models import Conversation, Message


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ["id", "role", "content", "metadata", "created_at"]
        read_only_fields = ["id", "created_at"]


class ConversationSerializer(serializers.ModelSerializer):
    last_message_preview = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            "id", "project", "title", "created_at", "updated_at",
            "last_message_preview",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_last_message_preview(self, obj):
        """Return the first text line from the last user/assistant message."""
        last_msg = (
            obj.messages
            .filter(role__in=["user", "assistant"])
            .order_by("-created_at")
            .values_list("content", flat=True)
            .first()
        )
        if not last_msg:
            return ""
        text = last_msg.strip()
        if not text:
            return ""
        first_line = text.split("\n", 1)[0]
        return first_line[:120]
