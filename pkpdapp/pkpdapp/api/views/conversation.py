#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from pkpdapp.models import Conversation, Message
from pkpdapp.api.serializers import ConversationSerializer, MessageSerializer
from pkpdapp.api.views import CheckAccessToProject


class ConversationViewSet(viewsets.ModelViewSet):
    queryset = Conversation.objects.all()
    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated & CheckAccessToProject]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        qs = Conversation.objects.filter(
            user=self.request.user,
            is_active=True,
        )
        project_id = self.request.query_params.get("project_id")
        if project_id is not None:
            qs = qs.filter(project_id=project_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="project_id",
                description="Filter conversations by project ID",
                required=False,
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
            ),
        ],
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)


class MessageViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Message.objects.all()
    serializer_class = MessageSerializer

    def get_queryset(self):
        conversation_id = self.request.query_params.get("conversation_id")
        if conversation_id is None:
            return Message.objects.none()
        return Message.objects.filter(
            conversation_id=conversation_id,
            conversation__user=self.request.user,
            conversation__is_active=True,
        ).order_by("created_at")

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="conversation_id",
                description="Filter messages by conversation ID",
                required=True,
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
            ),
        ],
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
