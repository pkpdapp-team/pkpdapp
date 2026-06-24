#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from django.http import StreamingHttpResponse
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView
from rest_framework import status

from pkpdapp.models import Conversation
from pkpdapp.utils.chatbot import (
    stream_chat_response,
    check_chatbot_config,
    ChatbotConfigError,
)


class ChatbotRateThrottle(UserRateThrottle):
    scope = "chatbot"


class ChatbotView(APIView):
    # Authentication (SessionAuthentication) and IsAuthenticated come from
    # the project-wide DRF defaults; only the per-endpoint rate limit is
    # specific to the chatbot.
    throttle_classes = [ChatbotRateThrottle]

    def post(self, request):
        conversation_id = request.data.get("conversation_id")
        content = request.data.get("content")

        if not conversation_id or not content:
            return Response(
                {"error": "'conversation_id' and 'content' are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not isinstance(content, str) or not content.strip():
            return Response(
                {"error": "'content' must be a non-empty string."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(content) > 10000:
            return Response(
                {"error": "Message content too long (max 10000 chars)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            conversation = Conversation.objects.get(
                id=conversation_id,
                user=request.user,
                is_active=True,
            )
        except Conversation.DoesNotExist:
            return Response(
                {"error": "Conversation not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            check_chatbot_config()
        except ChatbotConfigError as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        generator = stream_chat_response(conversation, content.strip())
        response = StreamingHttpResponse(
            generator,
            content_type="text/event-stream; charset=utf-8",
        )
        response["Cache-Control"] = "no-cache"
        response["X-Content-Type-Options"] = "nosniff"
        response["x-vercel-ai-ui-message-stream"] = "v1"
        return response
