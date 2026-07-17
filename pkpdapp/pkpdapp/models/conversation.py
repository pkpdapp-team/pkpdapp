#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from django.conf import settings


class Conversation(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="conversations",
    )
    project = models.ForeignKey(
        "Project",
        on_delete=models.CASCADE,
        related_name="conversations",
        null=True,
        blank=True,
    )
    title = models.CharField(
        max_length=200, blank=True, default="Untitled conversation"
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.title or f"Conversation {self.pk}"

    def get_project(self):
        return self.project

    def last_message_preview(self):
        """Return the first text line from the last user/assistant message."""
        last_msg = (
            self.messages
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

    def add_user_message(self, content):
        """Persist a user message to the database and return it."""
        return Message.objects.create(
            conversation=self,
            role="user",
            content=content,
        )

    def save_assistant_message(self, text_parts):
        """Persist accumulated assistant text to the database."""
        content = "".join(text_parts)
        if content.strip():
            Message.objects.create(
                conversation=self,
                role="assistant",
                content=content,
            )

    def build_input_items(self, max_messages=40):
        """Reconstruct the Responses API input array from DB messages.

        Returns a list suitable for passing to
        client.responses.create(input=...). Only user and assistant messages
        are replayed.
        """
        db_messages = list(
            self.messages.order_by("id")
        )
        if len(db_messages) > max_messages:
            db_messages = db_messages[-max_messages:]

        input_items = []
        for m in db_messages:
            if m.role == "user":
                input_items.append({"role": "user", "content": m.content})
            elif m.role == "assistant":
                input_items.append({"role": "assistant", "content": m.content})
        return input_items


class Message(models.Model):
    # The full role set is declared up front. Basic chat only ever writes
    # "user" and "assistant" rows, but tool-calling (added in a later change)
    # writes "tool_call"/"tool_result" rows — declaring them now means that
    # feature adds behaviour, not a schema migration.
    ROLE_CHOICES = [
        ("user", "User"),
        ("assistant", "Assistant"),
        ("tool_call", "Tool Call"),
        ("tool_result", "Tool Result"),
    ]

    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    content = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
