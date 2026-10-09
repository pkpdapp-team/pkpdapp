#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import pkpdapp.tests  # noqa: F401
from unittest import mock

from django.contrib.auth.models import User
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from pkpdapp.models import Compound, Conversation, Message, Project
from pkpdapp.api.views import conversation as conversation_views


class ConversationViewTestCase(APITestCase):
    def setUp(self):
        self.compound = Compound.objects.create(name="demo")
        self.project = Project.objects.create(
            name="demo project", compound=self.compound
        )
        self.user = User.objects.create_user(username="testuser", password="12345")
        self.project.users.add(self.user)  # grants ProjectAccess
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_create_conversation_sets_owner(self):
        response = self.client.post(
            "/api/conversations/", {"project": self.project.id}
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        conversation = Conversation.objects.get(id=response.data["id"])
        self.assertEqual(conversation.user, self.user)

    @override_settings(PORTKEY_API_KEY="some-key", CHATBOT_MODEL="some-model")
    def test_create_summarises_my_three_newest_changed_chats(self):
        mine = []
        for i in range(4):
            conversation = Conversation.objects.create(
                user=self.user, project=self.project
            )
            conversation.add_user_message(f"question {i}")
            mine.append(conversation)
        other_user = User.objects.create_user(username="other", password="12345")
        theirs = Conversation.objects.create(user=other_user, project=self.project)
        theirs.add_user_message("their question")

        fake_client = mock.Mock()
        fake_client.responses.create.return_value.output_text = "- a summary"
        with mock.patch.object(
            conversation_views, "get_client", return_value=fake_client
        ):
            response = self.client.post(
                "/api/conversations/", {"project": self.project.id}
            )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        summarized = Conversation.objects.exclude(summary="")
        self.assertCountEqual(summarized, mine[1:])

    def test_cannot_create_in_project_without_access(self):
        other_compound = Compound.objects.create(name="other")
        other_project = Project.objects.create(
            name="no access", compound=other_compound
        )
        response = self.client.post(
            "/api/conversations/", {"project": other_project.id}
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_only_returns_own_conversations(self):
        Conversation.objects.create(user=self.user, project=self.project)
        other_user = User.objects.create_user(username="other", password="12345")
        Conversation.objects.create(user=other_user, project=self.project)

        response = self.client.get("/api/conversations/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_list_shows_new_chats_first_then_latest_message(self):
        replied_last = Conversation.objects.create(
            user=self.user, project=self.project, title="replied last"
        )
        replied_first = Conversation.objects.create(
            user=self.user, project=self.project, title="replied first"
        )
        replied_first.add_user_message("hi")
        replied_last.add_user_message("hi")
        Conversation.objects.create(
            user=self.user, project=self.project, title="empty"
        )

        response = self.client.get("/api/conversations/")

        titles = [conversation["title"] for conversation in response.data]
        self.assertEqual(titles, ["empty", "replied last", "replied first"])

    def test_list_excludes_soft_deleted(self):
        Conversation.objects.create(
            user=self.user, project=self.project, is_active=False
        )
        response = self.client.get("/api/conversations/")
        self.assertEqual(len(response.data), 0)

    def test_destroy_soft_deletes(self):
        conversation = Conversation.objects.create(
            user=self.user, project=self.project
        )
        response = self.client.delete(f"/api/conversations/{conversation.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        conversation.refresh_from_db()
        self.assertFalse(conversation.is_active)


class MessageViewTestCase(APITestCase):
    def setUp(self):
        self.compound = Compound.objects.create(name="demo")
        self.project = Project.objects.create(
            name="demo project", compound=self.compound
        )
        self.user = User.objects.create_user(username="testuser", password="12345")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.conversation = Conversation.objects.create(
            user=self.user, project=self.project
        )
        Message.objects.create(
            conversation=self.conversation, role="user", content="hello"
        )

    def test_requires_conversation_id(self):
        response = self.client.get("/api/messages/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_lists_messages_for_conversation(self):
        response = self.client.get(
            f"/api/messages/?conversation_id={self.conversation.id}"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["content"], "hello")

    def test_cannot_read_other_users_messages(self):
        other_user = User.objects.create_user(username="other", password="12345")
        other_conversation = Conversation.objects.create(
            user=other_user, project=self.project
        )
        Message.objects.create(
            conversation=other_conversation, role="user", content="secret"
        )

        response = self.client.get(
            f"/api/messages/?conversation_id={other_conversation.id}"
        )
        self.assertEqual(len(response.data), 0)
