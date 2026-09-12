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
    Covariate,
    CovariatePopulation,
    Dataset,
    Dose,
    Message,
    Project,
    Protocol,
    SubjectGroup,
    Unit,
)
from pkpdapp.utils import chatbot
from pkpdapp.utils.chat_context import build_chat_context
from pkpdapp.utils.lognormal import mean_std_to_median_logvar


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

    def test_system_prompt_includes_current_page_from_context(self):
        block = self.context_block({"page": "Trial Design", "sub_page": "Dosing"})

        self.assertIn("Trial Design", block)
        self.assertIn("Dosing", block)

    def test_system_prompt_includes_project_context(self):
        # The only test running the real producer into the real formatter, so
        # it is what catches the two drifting apart.
        group = SubjectGroup.objects.create(
            name="Cohort A", project=self.project, m2f_ratio=0.4
        )
        covariate = Covariate.objects.create(
            project=self.project,
            name="albumin",
            type=Covariate.Type.CONTINUOUS,
            unit=Unit.objects.get(symbol="g/L"),
        )
        # The UI takes mean/std and stores the log-normal form, so build the
        # fixture the same way and assert the original values come back.
        median, variance = mean_std_to_median_logvar(42.0, 8.0)
        CovariatePopulation.objects.create(
            subject_group=group,
            covariate=covariate,
            median=median,
            variance=variance,
        )
        dataset = Dataset.objects.create(name="observed", project=self.project)
        observed = SubjectGroup.objects.create(
            name="Data-Group 1", project=self.project, dataset=dataset
        )
        protocol = Protocol.objects.create(
            name="observed arm",
            project=self.project,
            group=observed,
            dataset=dataset,
            amount_unit=Unit.objects.get(symbol="mg"),
            time_unit=Unit.objects.get(symbol="h"),
        )
        Dose.objects.create(protocol=protocol, start_time=0.0, amount=10.0)

        block = self.context_block(build_chat_context(self.project))

        self.assertIn("demo project", block)
        self.assertIn("male fraction 0.4", block)
        self.assertIn("albumin: mean=42.0 g/L, SD=8.0 g/L", block)
        self.assertIn("observed cohort from uploaded data", block)
        self.assertIn("doses from uploaded data", block)

    def test_system_prompt_includes_model_context(self):
        block = self.context_block({"model": {"name": "one compartment"}})

        self.assertIn("one compartment", block)

    def test_system_prompt_includes_secondary_models_and_extra_flags(self):
        block = self.context_block({
            "model": {
                "name": "combined",
                "has_anti_drug_antibodies": True,
                "has_bioavailability": True,
                "pk_model_extravascular": "first order absorption",
                "pk_effect_model": "effect compartment",
                "number_of_effect_compartments": 2,
                "pd_model2": "indirect response",
            },
        })

        self.assertIn("anti_drug_antibodies", block)
        self.assertIn("bioavailability", block)
        self.assertIn("PK extravascular model: first order absorption", block)
        self.assertIn("PK effect-compartment model: effect compartment", block)
        self.assertIn("Effect compartments: 2", block)
        self.assertIn("Second PD model: indirect response", block)

    def test_system_prompt_reports_what_is_not_configured(self):
        # Unset parts are reported as "none" rather than omitted, so the
        # assistant can advise on what the user has not turned on.
        # pk_effect_model is non-nullable with a DB default, so it is always
        # populated and must only be named when a compartment is in use.
        block = self.context_block({
            "model": {
                "name": "combined",
                "has_lag": True,
                "has_bioavailability": False,
                "pk_model_extravascular": None,
                "pk_effect_model": "Effect compartment model (ke0 & Kp)",
                "number_of_effect_compartments": 0,
                "pd_model2": None,
            },
        })

        self.assertIn("Features on: lag", block)
        self.assertIn("bioavailability", block.split("Features off:")[1])
        self.assertIn("PK extravascular model: none", block)
        self.assertIn("Effect compartments: none", block)
        self.assertIn("Second PD model: none", block)
        self.assertNotIn("effect-compartment model", block)
        # v2-only and never-set flags must not be reported at all: saying
        # "extravascular off" would contradict the PK extravascular line.
        self.assertNotIn("saturation", block)

    def test_system_prompt_includes_parameter_context(self):
        block = self.context_block({
            "variables": [{"name": "clearance", "value": 10}],
        })

        self.assertIn("clearance = 10", block)

    def test_system_prompt_shows_natural_scale_value_for_log_parameters(self):
        block = self.context_block({
            "variables": [{
                "name": "clearance",
                "value": 2.3,
                "unit": "L/h",
                "is_log": True,
                "description": "elimination clearance",
            }],
        })

        # chat_context already un-logs the value, so the prompt must show the
        # natural-scale number and must not invite a second un-logging.
        self.assertIn("clearance = 2.3 L/h", block)
        self.assertNotIn("log scale", block)
        self.assertIn("elimination clearance", block)

    def test_system_prompt_does_not_embed_the_model_definition(self):
        # Fetched with a tool instead; its literals contradict the
        # Parameters list.
        block = self.context_block({
            "model": {"name": "combined", "mmt": "[[model]]\nCL = 1\n"},
            "variables": [{"name": "CL", "value": 3.7, "unit": "L/h"}],
        })

        self.assertIn("combined", block)
        self.assertIn("CL = 3.7 L/h", block)
        self.assertNotIn("[[model]]", block)
        # The contradicting placeholder must not appear at all.
        self.assertNotIn("CL = 1", block)

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

    def test_system_prompt_includes_trial_design_context(self):
        block = self.context_block({
            "trial_design": {
                "ungrouped_protocols": [{"name": "daily dose"}],
            },
        })

        self.assertIn("daily dose", block)

    @override_settings(PORTKEY_API_KEY="", CHATBOT_MODEL="some-model")
    def test_check_chatbot_config_raises_without_api_key(self):
        with self.assertRaises(chatbot.ChatbotConfigError):
            chatbot.check_chatbot_config()

    @override_settings(PORTKEY_API_KEY="some-key", CHATBOT_MODEL="some-model")
    def test_check_chatbot_config_passes_with_api_key(self):
        # Should not raise.
        chatbot.check_chatbot_config()
