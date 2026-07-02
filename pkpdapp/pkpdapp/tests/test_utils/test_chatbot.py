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


def completed_event():
    return event("response.completed", response=SimpleNamespace(status="completed"))


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
        # _get_client caches a singleton, reset it so a leaked real client
        # from a previous test cannot bleed into this one.
        chatbot._client = None

    def test_stream_filters_tool_call_messages_from_api_input(self):
        Message.objects.create(
            conversation=self.conversation, role="user", content="hello"
        )
        Message.objects.create(
            conversation=self.conversation, role="assistant", content="hi"
        )
        Message.objects.create(
            conversation=self.conversation, role="tool_call", content="ignored"
        )

        fake_client = mock.Mock()
        fake_client.responses.create.return_value = [completed_event()]
        with mock.patch.object(chatbot, "_get_client", return_value=fake_client):
            list(chatbot.stream_chat_response(self.conversation, "new question"))

        input_items = fake_client.responses.create.call_args.kwargs["input"]
        # tool_call role is excluded; new message is appended last
        self.assertEqual(
            input_items,
            [
                {"role": "user", "content": "hello"},
                {"role": "assistant", "content": "hi"},
                {"role": "user", "content": "new question"},
            ],
        )

    def test_stream_truncates_input_to_40_message_window(self):
        for i in range(45):
            Message.objects.create(
                conversation=self.conversation, role="user", content=str(i)
            )

        fake_client = mock.Mock()
        fake_client.responses.create.return_value = [completed_event()]
        with mock.patch.object(chatbot, "_get_client", return_value=fake_client):
            list(chatbot.stream_chat_response(self.conversation, "new"))

        # 45 existing + "new" = 46 total; window of 40 drops the oldest 6.
        input_items = fake_client.responses.create.call_args.kwargs["input"]
        self.assertEqual(len(input_items), 40)
        self.assertEqual(input_items[0]["content"], "6")
        self.assertEqual(input_items[-1]["content"], "new")

    def test_stream_forwards_text_deltas_and_emits_error_on_stream_error(self):
        fake_client = mock.Mock()
        fake_client.responses.create.return_value = [
            event("response.output_text.delta", delta="Hel"),
            event("response.output_text.delta", delta="lo"),
            event("error", message="boom"),
        ]
        with mock.patch.object(chatbot, "_get_client", return_value=fake_client):
            chunks = list(chatbot.stream_chat_response(self.conversation, "question"))

        output = "".join(chunks)
        self.assertIn('"delta": "Hel"', output)
        self.assertIn('"delta": "lo"', output)
        self.assertIn('"type": "error"', output)
        self.assertIn('"errorText"', output)

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
                self.conversation.messages.order_by("id").values_list(
                    "role", "content"
                )
            ),
            [("user", "question"), ("assistant", "Answer")],
        )
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

    def test_stream_completes_normally_when_save_assistant_message_raises(self):
        fake_client = mock.Mock()
        fake_client.responses.create.return_value = [
            event("response.output_text.delta", delta="Answer"),
            completed_event(),
        ]

        with mock.patch.object(chatbot, "_get_client", return_value=fake_client):
            with mock.patch.object(
                self.conversation,
                "save_assistant_message",
                side_effect=Exception("db error"),
            ):
                chunks = list(chatbot.stream_chat_response(self.conversation, "question"))

        # [DONE] was already yielded before save_assistant_message is called,
        # so the client sees a complete stream regardless.
        self.assertIn("data: [DONE]\n\n", chunks)
        self.assertEqual(self.conversation.messages.filter(role="assistant").count(), 0)

    @override_settings(PORTKEY_API_KEY="")
    def test_check_chatbot_config_raises_without_api_key(self):
        with self.assertRaises(chatbot.ChatbotConfigError):
            chatbot.check_chatbot_config()

    @override_settings(PORTKEY_API_KEY="some-key")
    def test_check_chatbot_config_passes_with_api_key(self):
        # Should not raise.
        chatbot.check_chatbot_config()
