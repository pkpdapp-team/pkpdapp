#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import logging

from django.http import StreamingHttpResponse
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied
from rest_framework import serializers, status

from pkpdapp.models import Conversation, ProjectAccess
from pkpdapp.api.serializers import ChatbotRequestSerializer
from pkpdapp.utils.chat_context import build_chat_context
from pkpdapp.utils.chatbot import (
    stream_chat_response,
    check_chatbot_config,
    ChatbotConfigError,
)

logger = logging.getLogger(__name__)


class ChatbotRateThrottle(UserRateThrottle):
    scope = "chatbot"


class ChatbotErrorResponseSerializer(serializers.Serializer):
    error = serializers.CharField()


@extend_schema(
    request=ChatbotRequestSerializer,
    responses={
        (200, "text/event-stream"): OpenApiTypes.STR,
        400: ChatbotErrorResponseSerializer,
        404: ChatbotErrorResponseSerializer,
        503: ChatbotErrorResponseSerializer,
    },
)
class ChatbotView(APIView):
    # Authentication (SessionAuthentication) and IsAuthenticated come from
    # the project-wide DRF defaults; only the per-endpoint rate limit is
    # specific to the chatbot.
    throttle_classes = [ChatbotRateThrottle]

    def post(self, request):
        serializer = ChatbotRequestSerializer(data=request.data)
        if not serializer.is_valid():
            error_response = ChatbotErrorResponseSerializer(
                {"error": str(serializer.errors)}
            )
            return Response(
                error_response.data,
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data
        conversation_id = data["conversation_id"]
        content = data["content"]
        client_context = data.get("context") or {}

        try:
            conversation = Conversation.objects.get(
                id=conversation_id,
                user=request.user,
                is_active=True,
            )
        except Conversation.DoesNotExist:
            error_response = ChatbotErrorResponseSerializer(
                {"error": "Conversation not found."}
            )
            return Response(
                error_response.data,
                status=status.HTTP_404_NOT_FOUND,
            )

        # Ownership above guarantees conversation.user == request.user, but a
        # conversation also belongs to a project. Mirror CheckAccessToProject
        # (used by ConversationViewSet) so a user who no longer has access to
        # the conversation's project cannot keep chatting against it.
        project = conversation.get_project()
        if project is not None and not request.user.is_superuser:
            has_access = ProjectAccess.objects.filter(
                project=project,
                user=request.user,
            ).exists()
            if not has_access:
                raise PermissionDenied(
                    "You do not have access to this conversation's project."
                )

        try:
            check_chatbot_config()
        except ChatbotConfigError as e:
            error_response = ChatbotErrorResponseSerializer({"error": str(e)})
            return Response(
                error_response.data, status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        server_context = {}
        if project is not None:
            try:
                server_context = build_chat_context(project)
            except Exception:
                logger.exception(
                    "[chatbot] failed to build context for project=%s",
                    project.pk,
                )

        # Server-owned context takes precedence.
        assert client_context.keys().isdisjoint(server_context.keys())
        merged_context = {**client_context, **server_context}

        generator = stream_chat_response(
            conversation, content, context=merged_context or None
        )
        response = StreamingHttpResponse(
            generator,
            content_type="text/event-stream; charset=utf-8",
        )
        response["Cache-Control"] = "no-cache"
        response["X-Content-Type-Options"] = "nosniff"
        response["x-vercel-ai-ui-message-stream"] = "v1"
        return response
