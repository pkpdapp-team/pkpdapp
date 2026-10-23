#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import pkpdapp.tests  # noqa: F401
from django.test import SimpleTestCase

from pkpdapp.api.serializers import (
    ChatbotContextSerializer,
    ChatbotRequestSerializer,
)
from pkpdapp.api.serializers.chatbot import MAX_MESSAGE_LENGTH


class ChatbotContextSerializerTestCase(SimpleTestCase):
    """The serializer is a pure whitelist over a dict: no models, no DB."""

    def errors(self, data):
        serializer = ChatbotContextSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        return serializer.errors

    def test_rejects_unknown_field(self):
        errors = self.errors({"page": "Model", "project_id": 7})
        self.assertEqual(
            errors, {"project_id": ["This field is not allowed."]}
        )

    def test_reports_every_unknown_field(self):
        errors = self.errors({"zebra": 1, "apple": 2})
        self.assertEqual(sorted(errors), ["apple", "zebra"])

    def test_unknown_field_is_rejected_before_field_validation(self):
        # the whitelist check runs first, so a bad page is not also reported
        errors = self.errors({"page": 42, "extra": "x"})
        self.assertEqual(list(errors), ["extra"])

    def test_rejects_non_string_page(self):
        # stock CharField would coerce this to "42"; StrictCharField must not
        self.assertIn("page", self.errors({"page": 42}))

    def test_rejects_boolean_sub_page(self):
        self.assertIn("sub_page", self.errors({"sub_page": True}))

    def test_rejects_list_page(self):
        self.assertIn("page", self.errors({"page": ["Model"]}))

    # limit of 200 chars
    def test_rejects_too_long_page(self):
        self.assertIn("page", self.errors({"page": "x" * 201}))

    def test_rejects_too_long_sub_page(self):
        self.assertIn("sub_page", self.errors({"sub_page": "x" * 201}))


class ChatbotRequestSerializerTestCase(SimpleTestCase):
    def test_accepts_a_long_optimisation_results_message(self):
        serializer = ChatbotRequestSerializer(
            data={"conversation_id": 1, "content": "x" * (MAX_MESSAGE_LENGTH)}
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_rejects_too_long_optimisation_results_message(self):
        serializer = ChatbotRequestSerializer(
            data={"conversation_id": 1, "content": "x" * (MAX_MESSAGE_LENGTH + 1)}
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("content", serializer.errors)
