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

from pkpdapp.models import (
    CombinedModel,
    Compound,
    Conversation,
    Message,
    PharmacodynamicModel,
    Project,
)
from pkpdapp.utils import chatbot
from pkpdapp.utils.chatbot_context import ChatContext


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
                chunks = list(
                    chatbot.stream_chat_response(self.conversation, "question")
                )

        # [DONE] was already yielded before save_assistant_message is called,
        # so the client sees a complete stream regardless.
        self.assertIn("data: [DONE]\n\n", chunks)
        self.assertEqual(self.conversation.messages.filter(role="assistant").count(), 0)

    def context_block(self, context):
        """Run one turn and return the user-context section of the system
        prompt.

        Assertions in the tests below target the values that reach the model,
        not the surrounding labels or layout, so the prompt wording can be
        tuned without breaking them.
        """
        fake_client = mock.Mock()
        fake_client.responses.create.return_value = [completed_event()]
        with mock.patch.object(chatbot, "_get_client", return_value=fake_client):
            list(
                chatbot.stream_chat_response(
                    self.conversation, "question", context=context
                )
            )

        prompt = fake_client.responses.create.call_args.kwargs["instructions"]
        # The marker itself is contractual: SYSTEM_PROMPT tells the model the
        # context lives under it. SYSTEM_PROMPT also *mentions* the marker in
        # its prose, so split on the last occurrence to get the real section.
        self.assertIn("[CURRENT USER CONTEXT]", prompt)
        return prompt.rsplit("[CURRENT USER CONTEXT]", 1)[1]

    def test_system_prompt_includes_the_chat_context(self):
        context = ChatContext.from_project(
            self.project,
            can_edit=True,
            current_page="Trial Design",
            current_sub_page="Dosing",
        )

        block = self.context_block(context)

        self.assertIn('"current_page":"Trial Design"', block)
        self.assertIn('"name":"demo project"', block)

    def test_system_prompt_includes_the_app_layout(self):
        prompt = chatbot._build_system_prompt()

        self.assertIn("[APP LAYOUT]", prompt)
        self.assertIn('"name":"Trial Design"', prompt)

    def test_current_model_definition_tool_describes_the_users_model(self):
        # The assembled .mmt is fetched through this tool instead of being
        # shipped in every system prompt, so the tool also has to cover the
        # cases the prompt used to handle by just omitting the block.
        unconfigured = chatbot._execute_tool(
            "get_current_model_definition", {}, conversation=self.conversation
        )
        self.assertIn("No model has been configured", unconfigured)

        CombinedModel.objects.create(name="combined", project=self.project)
        with mock.patch.object(
            CombinedModel, "get_mmt", return_value="[[model]]\nCL = 1\n"
        ):
            result = chatbot._execute_tool(
                "get_current_model_definition",
                {},
                conversation=self.conversation,
            )
        self.assertIn("combined", result)
        self.assertIn("CL = 1", result)
        # The .mmt carries library placeholders, so the result has to point
        # back at the context block for the user's real values.
        self.assertIn("[CURRENT USER CONTEXT]", result)

        projectless = chatbot._execute_tool(
            "get_current_model_definition",
            {},
            conversation=Conversation.objects.create(user=self.user),
        )
        self.assertIn("No project", projectless)

    def test_stream_runs_a_tool_call_and_feeds_the_result_back(self):
        library_model = PharmacodynamicModel.objects.filter(
            is_library_model=True
        ).first()

        fake_client = mock.Mock()
        fake_client.responses.create.side_effect = [
            [
                event(
                    "response.output_item.added",
                    output_index=0,
                    item=SimpleNamespace(
                        type="function_call",
                        call_id="call-1",
                        name="get_library_model_definition",
                    ),
                ),
                event(
                    "response.function_call_arguments.delta",
                    output_index=0,
                    delta='{"model_name":',
                ),
                event(
                    "response.function_call_arguments.done",
                    output_index=0,
                    arguments=f'{{"model_name": "{library_model.name}"}}',
                ),
                completed_event(),
            ],
            [
                event("response.output_text.delta", delta="Answer"),
                completed_event(),
            ],
        ]

        with mock.patch.object(chatbot, "_get_client", return_value=fake_client):
            chunks = list(chatbot.stream_chat_response(self.conversation, "question"))

        # The second round is where the tool result reaches the model.
        second_input = fake_client.responses.create.call_args_list[1].kwargs["input"]
        tool_output = second_input[-1]
        self.assertEqual(tool_output["type"], "function_call_output")
        self.assertEqual(tool_output["call_id"], "call-1")
        self.assertIn(library_model.name, tool_output["output"])
        self.assertIn('"delta": "Answer"', "".join(chunks))

    @override_settings(PORTKEY_API_KEY="", CHATBOT_MODEL="some-model")
    def test_check_chatbot_config_raises_without_api_key(self):
        with self.assertRaises(chatbot.ChatbotConfigError):
            chatbot.check_chatbot_config()

    @override_settings(PORTKEY_API_KEY="some-key", CHATBOT_MODEL="some-model")
    def test_check_chatbot_config_passes_with_api_key(self):
        # Should not raise.
        chatbot.check_chatbot_config()
