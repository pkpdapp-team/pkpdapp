#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import pkpdapp.tests  # noqa: F401
from django.contrib.auth.models import User
from django.test import TestCase

from pkpdapp.models import Compound, Conversation, Message, Project
from pkpdapp.api.serializers import ConversationSerializer


class ConversationSerializerTestCase(TestCase):
    def setUp(self):
        self.compound = Compound.objects.create(name="demo")
        self.project = Project.objects.create(
            name="demo project", compound=self.compound
        )
        self.user = User.objects.create_user(username="testuser", password="12345")
        self.conversation = Conversation.objects.create(
            user=self.user, project=self.project
        )

    def test_preview_empty_without_messages(self):
        data = ConversationSerializer(self.conversation).data
        self.assertEqual(data["last_message_preview"], "")

    def test_preview_uses_first_line_of_last_message(self):
        Message.objects.create(
            conversation=self.conversation, role="user", content="first"
        )
        Message.objects.create(
            conversation=self.conversation,
            role="assistant",
            content="last reply\nsecond line",
        )

        data = ConversationSerializer(self.conversation).data

        self.assertEqual(data["last_message_preview"], "last reply")

    def test_preview_ignores_tool_messages(self):
        Message.objects.create(
            conversation=self.conversation, role="assistant", content="real answer"
        )
        Message.objects.create(
            conversation=self.conversation, role="tool_call", content="tool noise"
        )

        data = ConversationSerializer(self.conversation).data

        self.assertEqual(data["last_message_preview"], "real answer")

    def test_preview_truncates_long_lines(self):
        Message.objects.create(
            conversation=self.conversation, role="user", content="x" * 200
        )

        data = ConversationSerializer(self.conversation).data

        self.assertEqual(len(data["last_message_preview"]), 120)
