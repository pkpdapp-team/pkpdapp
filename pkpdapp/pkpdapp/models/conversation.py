#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.contrib.auth.models import User
from django.db import models
from django.db.models import F, Q
from django.conf import settings

from pkpdapp.models.project import Project


class Conversation(models.Model):
    DEFAULT_TITLE = "Untitled conversation"

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
        max_length=200, blank=True, default=DEFAULT_TITLE
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_message_at = models.DateTimeField(null=True, blank=True)
    summary = models.TextField(blank=True, default="")
    summarized_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.title or f"Conversation {self.pk}"

    def get_project(self):
        return self.project

    def has_default_title(self):
        return self.title in ("", self.DEFAULT_TITLE)

    @classmethod
    def changed_since_summary(cls, user: User, project: Project):
        return (
            cls.objects.filter(
                user=user,
                project=project,
                is_active=True,
                last_message_at__isnull=False,
            )
            .filter(
                Q(summarized_at__isnull=True)
                | Q(last_message_at__gt=F("summarized_at"))
            )
            .order_by("-last_message_at")
        )

    def other_summaries(self):
        return (
            self.project.conversations
            .filter(user=self.user, is_active=True)
            .exclude(pk=self.pk)
            .exclude(summary="")
            .order_by("-last_message_at")
        )

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
        message = Message.objects.create(
            conversation=self,
            role="user",
            content=content,
        )
        self.last_message_at = message.created_at
        self.save(update_fields=["last_message_at"])
        return message

    def save_assistant_message(self, text_parts):
        """Persist accumulated assistant text to the database."""
        content = "".join(text_parts)
        if content.strip():
            message = Message.objects.create(
                conversation=self,
                role="assistant",
                content=content,
            )
            self.last_message_at = message.created_at
            self.save(update_fields=["last_message_at"])

    def build_input_items(self, max_messages=40):
        """Reconstruct the Responses API input array from DB messages.

        Returns a list suitable for passing to
        client.responses.create(input=...). Only user and assistant messages
        are replayed.
        """
        db_messages = list(
            self.messages.order_by("created_at")
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
    # tool roles are for saving tool calls later, declared now to avoid a migration
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
