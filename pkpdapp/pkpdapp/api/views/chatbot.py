#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from django.http import StreamingHttpResponse
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView
from rest_framework import status

from pkpdapp.utils.chatbot import (
    stream_chat_response,
    check_chatbot_config,
    ChatbotConfigError,
)


class ChatbotRateThrottle(UserRateThrottle):
    scope = "chatbot"


class ChatbotView(APIView):

    # called by APIView methods when ChatbotView is used as api
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]
    throttle_classes = [ChatbotRateThrottle]

    def post(self, request):
        messages = request.data.get("messages")

        MAX_MESSAGES = 50
        MAX_CONTENT_LENGTH = 10000

        if not isinstance(messages, list) or len(messages) == 0:
            return Response(
                {"error": "A non-empty 'messages' list is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(messages) > MAX_MESSAGES:
            return Response(
                {"error": f"Too many messages. Maximum is {MAX_MESSAGES}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ALLOWED_ROLES = {"user", "assistant"}

        for msg in messages:
            # validity checks
            if not isinstance(msg, dict) \
               or "role" not in msg \
               or "content" not in msg:
                return Response(
                    {"error": "Each message must have 'role' and 'content' keys."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if msg["role"] not in ALLOWED_ROLES:
                return Response(
                    {"error": f"Invalid role '{msg['role']}'. "
                              f"Allowed roles: {', '.join(sorted(ALLOWED_ROLES))}."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not isinstance(msg["content"], str) \
               or len(msg["content"].strip()) == 0:
                return Response(
                    {"error": "Each message 'content' must be a "
                              "non-empty string."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if len(msg["content"]) > MAX_CONTENT_LENGTH:
                return Response(
                    {"error": f"Message content too long. "
                              f"Maximum is {MAX_CONTENT_LENGTH} characters."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Optional user context (current page, model, variables)
        context = request.data.get("context")
        if context is not None and not isinstance(context, dict):
            return Response(
                {"error": "'context' must be an object if provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            check_chatbot_config()
        except ChatbotConfigError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        # actual LLM call happens here
        generator = stream_chat_response(messages, context=context)

        response = StreamingHttpResponse(
            generator,
            content_type="text/event-stream; charset=utf-8",
        )
        response["Cache-Control"] = "no-cache"
        response["X-Content-Type-Options"] = "nosniff"
        response["x-vercel-ai-ui-message-stream"] = "v1"
        return response
