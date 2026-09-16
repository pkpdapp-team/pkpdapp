#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from unittest.mock import ANY, patch

import pkpdapp.tests  # noqa: F401
from pkpdapp.models import Compound, Project, Conversation  # noqa: F401
from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from django.test import override_settings
from rest_framework import status


@override_settings(
    PORTKEY_API_KEY="test-key",
    CHATBOT_MODEL="test-model",
)
class ChatbotViewTestCase(APITestCase):
    def setUp(self):
        self.compound = Compound.objects.create(name="demo")
        self.project = Project.objects.create(name="demo", compound=self.compound)
        self.user = User.objects.create_user(username="testuser", password="12345")
        self.project.users.add(self.user)          # creates the ProjectAccess row
        self.conversation = Conversation.objects.create(
            user=self.user, project=self.project
        )
        self.client.force_authenticate(user=self.user)

    def test_missing_conversation_id(self):
        data = {"content": "Hello",
                "context": {
                    "page": "the_page",
                    "sub_page": "the_sub_page"
                }
                }

        response = self.client.post("/api/chatbot/", data=data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("conversation_id", response.data["details"])

    def test_missing_content(self):
        data = {
            "conversation_id": self.conversation.id,
            "context": {"page": "the_page", "sub_page": "the_sub_page"}
        }

        response = self.client.post("/api/chatbot/", data=data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("content", response.data["details"])

    def test_valid_request(self):
        data = {
            "conversation_id": self.conversation.id,
            "content": "Hello",
            "context": {"page": "the_page", "sub_page": "the_sub_page"}
        }

        response = self.client.post("/api/chatbot/", data=data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_invalid_context(self):
        data = {
            "conversation_id": self.conversation.id,
            "content": "Hello",
            "context": 42,
        }

        response = self.client.post("/api/chatbot/", data=data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("context", response.data["details"])

    def test_stream_receives_trimmed_message(self):
        data = {
            "conversation_id": self.conversation.id,
            "content": "  Hello  ",
        }

        with patch(
            "pkpdapp.api.views.chatbot.stream_chat_response",
            return_value=iter(()),  # empty stream for StreamingHttpResponse
        ) as stream_response:
            response = self.client.post("/api/chatbot/", data=data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        stream_response.assert_called_once_with(
            self.conversation, "Hello", context=ANY
        )

    def test_api_key_not_set(self):
        with override_settings(PORTKEY_API_KEY=None):
            data = {
                "conversation_id": self.conversation.id,
                "content": "Hello",
                "context": {"page": "the_page", "sub_page": "the_sub_page"}
            }
            response = self.client.post("/api/chatbot/", data=data, format="json")
            self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
