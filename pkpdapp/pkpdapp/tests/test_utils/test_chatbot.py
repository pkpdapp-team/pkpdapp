#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import pkpdapp.tests  # noqa: F401
from types import SimpleNamespace
from unittest import mock

from django.contrib.auth.models import User
from django.test import TestCase, override_settings

from pkpdapp.models import Compound, Conversation, Message, Project
from pkpdapp.utils import chatbot


def event(type, **kwargs):
    """Build a fake Responses API stream event."""
    return SimpleNamespace(type=type, **kwargs)


class ChatbotUtilsTestCase(TestCase):
    def setUp(self):
        self.compound = Compound.objects.create(name="demo")
        self.project = Project.objects.create(
            name="demo project", compound=self.compound
        )
        self.user = User.objects.create_user(username="testuser", password="12345")
        self.conversation = Conversation.objects.create(
            user=self.user, project=self.project
        )

    def test_build_input_items_filters_and_orders(self):
        Message.objects.create(
            conversation=self.conversation, role="user", content="hello"
        )
        Message.objects.create(
            conversation=self.conversation, role="assistant", content="hi"
        )
        Message.objects.create(
            conversation=self.conversation, role="tool_call", content="ignored"
        )

        items = chatbot._build_input_items(self.conversation)

        self.assertEqual(
            items,
            [
                {"role": "user", "content": "hello"},
                {"role": "assistant", "content": "hi"},
            ],
        )

    def test_build_input_items_respects_max_messages(self):
        for i in range(45):
            Message.objects.create(
                conversation=self.conversation, role="user", content=str(i)
            )

        items = chatbot._build_input_items(self.conversation, max_messages=40)

        self.assertEqual(len(items), 40)
        self.assertEqual(items[0]["content"], "5")
        self.assertEqual(items[-1]["content"], "44")

    def test_process_response_stream_yields_text_and_error(self):
        stream = [
            event("response.output_text.delta", delta="Hel"),
            event("response.output_text.delta", delta="lo"),
            event("error", message="boom"),
        ]

        results = list(chatbot._process_response_stream(stream))

        self.assertEqual(results[0], ("text", "Hel"))
        self.assertEqual(results[1], ("text", "lo"))
        self.assertEqual(results[-1], ("error", "boom"))

    def test_stream_chat_response_persists_messages_on_success(self):
        fake_client = mock.Mock()
        fake_client.responses.create.return_value = [
            event("response.output_text.delta", delta="Answer"),
            event(
                "response.completed",
                response=SimpleNamespace(status="completed"),
            ),
        ]

        with mock.patch.object(chatbot, "_get_client", return_value=fake_client):
            chunks = list(chatbot.stream_chat_response(self.conversation, "question"))

        # The user turn and the assistant reply are both persisted.
        self.assertEqual(
            list(
                self.conversation.messages.order_by("created_at").values_list(
                    "role", "content"
                )
            ),
            [("user", "question"), ("assistant", "Answer")],
        )
        # The stream terminates with the Vercel AI SDK done marker.
        self.assertIn("data: [DONE]\n\n", chunks)

    def test_stream_chat_response_does_not_persist_partial_on_error(self):
        fake_client = mock.Mock()
        fake_client.responses.create.return_value = [
            event("response.output_text.delta", delta="partial"),
            event("error", message="boom"),
        ]

        with mock.patch.object(chatbot, "_get_client", return_value=fake_client):
            list(chatbot.stream_chat_response(self.conversation, "question"))

        # User message is saved, but no assistant message for a failed stream.
        self.assertEqual(self.conversation.messages.filter(role="user").count(), 1)
        self.assertEqual(
            self.conversation.messages.filter(role="assistant").count(), 0
        )

    @override_settings(PORTKEY_API_KEY="")
    def test_check_chatbot_config_raises_without_api_key(self):
        with self.assertRaises(chatbot.ChatbotConfigError):
            chatbot.check_chatbot_config()

    @override_settings(PORTKEY_API_KEY="some-key")
    def test_check_chatbot_config_passes_with_api_key(self):
        # Should not raise.
        chatbot.check_chatbot_config()
